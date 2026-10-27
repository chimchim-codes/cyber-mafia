const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const { generateAIResponse } = require('../services/aiService');
const { createOrUpdateTicket } = require('../services/ticketService');

// In-memory cache to prevent duplicate message emissions during reconnects
const processedTempIds = new Set();

function initChatSocket(io) {
  io.on('connection', socket => {
    let currentConversationId = null;
    let currentUser = null;

    console.log(`🔌 Socket connected: ${socket.id}`);

    // Join Agent Desk room for support agents and administrators
    socket.on('join_agent_desk', async ({ user }) => {
      try {
        currentUser = user;
        socket.join('agent_desk');
        console.log(`🎧 Agent ${user?.name || socket.id} joined agent_desk room`);

        // Broadcast online agent count update
        const connectedSockets = await io.in('agent_desk').fetchSockets();
        io.emit('online_agents_count', { count: connectedSockets.length });
      } catch (err) {
        console.error('Error joining agent desk:', err.message);
      }
    });

    // Join specific conversation room
    socket.on('join_conversation', async ({ conversationId, user, role = 'customer' }) => {
      try {
        if (currentConversationId) {
          socket.leave(`conversation:${currentConversationId}`);
        }

        currentConversationId = conversationId;
        socket.join(`conversation:${conversationId}`);
        currentUser = user;

        const conversation = await Conversation.findById(conversationId)
          .populate('assignedAgentId', 'name email avatar role')
          .populate('ticketId');

        if (!conversation) {
          socket.emit('error_message', { message: 'Conversation not found.' });
          return;
        }

        // Reset unread count for the viewer
        if (role === 'agent') {
          conversation.unreadCountAgent = 0;
          await conversation.save();
        } else if (role === 'customer') {
          conversation.unreadCountCustomer = 0;
          await conversation.save();
        }

        // Fetch recent messages
        const messages = await Message.find({ conversationId }).sort({ createdAt: 1 });

        socket.emit('joined_conversation', {
          conversation,
          messages,
        });

        console.log(`💬 Socket ${socket.id} joined room conversation:${conversationId}`);
      } catch (err) {
        console.error('Error joining conversation:', err.message);
        socket.emit('error_message', { message: 'Failed to join conversation room.' });
      }
    });

    // Customer sends message
    socket.on('customer_message', async payload => {
      try {
        const { conversationId, content, tempId, customerName, customerEmail } = payload;

        if (!content || !content.trim()) return;

        // Dedup check
        if (tempId && processedTempIds.has(tempId)) {
          console.log(`⚠️ Duplicate message ignored (tempId: ${tempId})`);
          return;
        }
        if (tempId) {
          processedTempIds.add(tempId);
          setTimeout(() => processedTempIds.delete(tempId), 30000);
        }

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
          socket.emit('error_message', { message: 'Conversation not found.' });
          return;
        }

        // Update customer details if provided
        if (customerName && conversation.customerName === 'Guest Customer') {
          conversation.customerName = customerName;
        }
        if (customerEmail && !conversation.customerEmail) {
          conversation.customerEmail = customerEmail;
        }

        // Save customer message
        const customerMsg = await Message.create({
          conversationId,
          senderType: 'customer',
          senderName: conversation.customerName || 'Customer',
          content: content.trim(),
          messageType: 'text',
          deliveryStatus: 'delivered',
        });

        conversation.lastMessage = {
          content: customerMsg.content,
          senderType: 'customer',
          createdAt: customerMsg.createdAt,
        };

        // Broadcast customer message to room
        io.to(`conversation:${conversationId}`).emit('message_received', {
          message: customerMsg,
          tempId,
        });

        // 1. If AI Active: generate AI response
        if (conversation.status === 'AI Active') {
          // Emit typing indicator
          io.to(`conversation:${conversationId}`).emit('partner_typing', {
            isTyping: true,
            sender: 'ai',
            name: 'SupportHub AI',
          });

          const recentMessages = await Message.find({ conversationId })
            .sort({ createdAt: -1 })
            .limit(8);

          // Simulate slight human-like thinking delay (600ms) for smooth UX
          await new Promise(r => setTimeout(r, 600));

          const aiResult = await generateAIResponse({
            conversation,
            recentMessages: recentMessages.reverse(),
            userMessage: content.trim(),
          });

          // Stop typing indicator
          io.to(`conversation:${conversationId}`).emit('partner_typing', {
            isTyping: false,
            sender: 'ai',
            name: 'SupportHub AI',
          });

          // Escalation handling
          if (aiResult.shouldEscalate) {
            conversation.status = 'Waiting for Agent';
            conversation.priority = aiResult.sentiment === 'frustrated' ? 'High' : 'Medium';

            const ticket = await createOrUpdateTicket({
              conversationId: conversation._id,
              customerId: conversation.customerId,
              customerName: conversation.customerName,
              customerEmail: conversation.customerEmail,
              subject: `Chat Escalation: ${content.trim().slice(0, 45)}...`,
              description: content.trim(),
              priority: conversation.priority,
              escalationReason: 'Customer requested human assistance or AI confidence trigger',
            });

            conversation.ticketId = ticket._id;

            // Notify agent desk
            io.to('agent_desk').emit('new_escalation', {
              conversation: await Conversation.findById(conversation._id).populate('ticketId'),
              ticket,
            });
          }

          if (!conversation.firstResponseTimeMs) {
            conversation.firstResponseTimeMs = Date.now() - new Date(conversation.createdAt).getTime();
          }

          const aiMsg = await Message.create({
            conversationId,
            senderType: 'ai',
            senderName: 'SupportHub AI',
            content: aiResult.content,
            messageType: aiResult.messageType || 'text',
            meta: {
              promptEscalation: aiResult.promptEscalation,
              matchedFaqId: aiResult.matchedFaqId,
              sentiment: aiResult.sentiment,
            },
          });

          conversation.lastMessage = {
            content: aiMsg.content,
            senderType: 'ai',
            createdAt: aiMsg.createdAt,
          };

          await conversation.save();

          io.to(`conversation:${conversationId}`).emit('message_received', {
            message: aiMsg,
          });

          io.to(`conversation:${conversationId}`).emit('conversation_updated', {
            conversation,
          });

          io.to('agent_desk').emit('conversation_updated', {
            conversation,
          });
        } else {
          // If conversation is Waiting for Agent or Agent Connected
          conversation.unreadCountAgent += 1;
          await conversation.save();

          io.to('agent_desk').emit('conversation_updated', {
            conversation,
          });
        }
      } catch (err) {
        console.error('Error in customer_message handler:', err);
        socket.emit('error_message', { message: 'Failed to deliver message. Please retry.' });
      }
    });

    // Agent sends message
    socket.on('agent_message', async payload => {
      try {
        const { conversationId, content, agentId, agentName, tempId } = payload;
        if (!content || !content.trim()) return;

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) return;

        const agentMsg = await Message.create({
          conversationId,
          senderType: 'agent',
          senderId: agentId || currentUser?._id,
          senderName: agentName || currentUser?.name || 'Support Agent',
          content: content.trim(),
          messageType: 'text',
          deliveryStatus: 'delivered',
        });

        conversation.lastMessage = {
          content: agentMsg.content,
          senderType: 'agent',
          createdAt: agentMsg.createdAt,
        };
        conversation.unreadCountCustomer += 1;
        await conversation.save();

        io.to(`conversation:${conversationId}`).emit('message_received', {
          message: agentMsg,
          tempId,
        });

        io.to('agent_desk').emit('conversation_updated', {
          conversation,
        });
      } catch (err) {
        console.error('Error in agent_message handler:', err);
      }
    });

    // Customer requests escalation to human
    socket.on('request_escalation', async ({ conversationId, reason }) => {
      try {
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) return;

        conversation.status = 'Waiting for Agent';
        conversation.priority = 'High';

        const ticket = await createOrUpdateTicket({
          conversationId: conversation._id,
          customerId: conversation.customerId,
          customerName: conversation.customerName,
          customerEmail: conversation.customerEmail,
          subject: 'Customer Escalation Request',
          description: reason || 'Customer requested live human support in chat.',
          priority: 'High',
          escalationReason: reason || 'Direct customer escalation button clicked',
        });

        conversation.ticketId = ticket._id;
        await conversation.save();

        // System message
        const sysMsg = await Message.create({
          conversationId,
          senderType: 'system',
          content: 'You have been connected to the live agent queue. A support specialist will assist you shortly.',
          messageType: 'system',
        });

        io.to(`conversation:${conversationId}`).emit('message_received', { message: sysMsg });
        io.to(`conversation:${conversationId}`).emit('conversation_updated', { conversation });

        // Alert agent desk
        io.to('agent_desk').emit('new_escalation', {
          conversation,
          ticket,
        });
        io.to('agent_desk').emit('conversation_updated', { conversation });
      } catch (err) {
        console.error('Error escalating conversation:', err);
      }
    });

    // Agent accepts conversation
    socket.on('accept_conversation', async ({ conversationId, agentId, agentName }) => {
      try {
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) return;

        conversation.assignedAgentId = agentId || currentUser?._id;
        conversation.status = 'Agent Connected';
        await conversation.save();

        if (conversation.ticketId) {
          await createOrUpdateTicket({
            conversationId: conversation._id,
            status: 'In Progress',
            assignedAgentId: conversation.assignedAgentId,
          });
        }

        const name = agentName || currentUser?.name || 'A support agent';
        const sysMsg = await Message.create({
          conversationId,
          senderType: 'system',
          content: `${name} has joined the conversation to assist you.`,
          messageType: 'system',
        });

        const updated = await Conversation.findById(conversationId).populate('assignedAgentId', 'name email avatar role');

        io.to(`conversation:${conversationId}`).emit('message_received', { message: sysMsg });
        io.to(`conversation:${conversationId}`).emit('conversation_updated', { conversation: updated });
        io.to('agent_desk').emit('conversation_updated', { conversation: updated });
      } catch (err) {
        console.error('Error accepting conversation:', err);
      }
    });

    // Resolve or Close conversation
    socket.on('resolve_conversation', async ({ conversationId, resolvedBy, role }) => {
      try {
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) return;

        conversation.status = 'Resolved';
        conversation.resolvedBy = resolvedBy || (role === 'agent' ? 'Agent' : 'AI');
        conversation.resolvedAt = new Date();
        conversation.resolutionTimeMs = Date.now() - new Date(conversation.createdAt).getTime();
        await conversation.save();

        const sysMsg = await Message.create({
          conversationId,
          senderType: 'system',
          content: 'This conversation has been marked as resolved. Thank you for contacting SupportHub!',
          messageType: 'system',
        });

        io.to(`conversation:${conversationId}`).emit('message_received', { message: sysMsg });
        io.to(`conversation:${conversationId}`).emit('conversation_updated', { conversation });
        io.to('agent_desk').emit('conversation_updated', { conversation });
      } catch (err) {
        console.error('Error resolving conversation:', err);
      }
    });

    // Leave offline message when no agents are available
    socket.on('leave_offline_message', async ({ conversationId, email, message, name }) => {
      try {
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) return;

        if (email) conversation.customerEmail = email;
        if (name) conversation.customerName = name;
        conversation.status = 'Waiting for Agent';
        conversation.priority = 'Medium';

        const ticket = await createOrUpdateTicket({
          conversationId: conversation._id,
          customerId: conversation.customerId,
          customerName: conversation.customerName,
          customerEmail: email || conversation.customerEmail,
          subject: 'Offline Support Inquiry',
          description: message,
          priority: 'Medium',
          escalationReason: 'No live agents currently online; customer left offline message',
        });

        conversation.ticketId = ticket._id;
        await conversation.save();

        const replyMsg = await Message.create({
          conversationId,
          senderType: 'system',
          content: `Thank you! Your message has been logged under ticket #${ticket.ticketNumber}. Our team will respond to ${email || 'your email'} as soon as our agents are back online.`,
          messageType: 'ticket_update',
        });

        io.to(`conversation:${conversationId}`).emit('message_received', { message: replyMsg });
        io.to(`conversation:${conversationId}`).emit('conversation_updated', { conversation });
        io.to('agent_desk').emit('new_escalation', { conversation, ticket });
      } catch (err) {
        console.error('Error submitting offline message:', err);
      }
    });

    // Typing indicators
    socket.on('typing_start', ({ conversationId, name, sender }) => {
      socket.to(`conversation:${conversationId}`).emit('partner_typing', {
        isTyping: true,
        name: name || 'User',
        sender: sender || 'customer',
      });
    });

    socket.on('typing_stop', ({ conversationId, name, sender }) => {
      socket.to(`conversation:${conversationId}`).emit('partner_typing', {
        isTyping: false,
        name: name || 'User',
        sender: sender || 'customer',
      });
    });

    socket.on('disconnect', async () => {
      console.log(`🔌 Socket disconnected: ${socket.id}`);
      try {
        const connectedSockets = await io.in('agent_desk').fetchSockets();
        io.emit('online_agents_count', { count: connectedSockets.length });
      } catch (err) {
        // ignore
      }
    });
  });
}

module.exports = {
  initChatSocket,
};
