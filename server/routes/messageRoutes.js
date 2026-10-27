const express = require('express');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const { generateAIResponse } = require('../services/aiService');
const { createOrUpdateTicket } = require('../services/ticketService');

const router = express.Router();

// GET /api/messages/:conversationId - Get messages for conversation
router.get('/:conversationId', async (req, res) => {
  try {
    const messages = await Message.find({ conversationId: req.params.conversationId }).sort({ createdAt: 1 });
    res.json({ success: true, messages });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve messages.', error: err.message });
  }
});

// POST /api/messages/:conversationId - Send message via REST API
router.post('/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { content, senderType = 'customer', senderId, senderName, messageType = 'text' } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Message content cannot be empty.' });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found.' });
    }

    // 1. Create and save the sender's message
    const userMsg = await Message.create({
      conversationId,
      senderType,
      senderId,
      senderName: senderName || (senderType === 'customer' ? conversation.customerName : 'Support Agent'),
      content: content.trim(),
      messageType,
      deliveryStatus: 'delivered',
    });

    conversation.lastMessage = {
      content: userMsg.content,
      senderType,
      createdAt: userMsg.createdAt,
    };

    let aiMessage = null;

    // 2. Handle AI response if conversation is in 'AI Active' mode and sender is customer
    if (senderType === 'customer' && conversation.status === 'AI Active') {
      const recentMessages = await Message.find({ conversationId })
        .sort({ createdAt: -1 })
        .limit(8);

      const aiResult = await generateAIResponse({
        conversation,
        recentMessages: recentMessages.reverse(),
        userMessage: content.trim(),
      });

      if (aiResult.shouldEscalate) {
        // Automatically escalate
        conversation.status = 'Waiting for Agent';
        conversation.priority = aiResult.sentiment === 'frustrated' ? 'High' : 'Medium';

        const ticket = await createOrUpdateTicket({
          conversationId: conversation._id,
          customerId: conversation.customerId,
          customerName: conversation.customerName,
          customerEmail: conversation.customerEmail,
          subject: `Chat Escalation: ${content.trim().slice(0, 50)}...`,
          description: content.trim(),
          priority: conversation.priority,
          escalationReason: 'AI determined need for human assistance or customer requested human',
        });

        conversation.ticketId = ticket._id;
      }

      // Record first response time if not already recorded
      if (!conversation.firstResponseTimeMs) {
        conversation.firstResponseTimeMs = Date.now() - new Date(conversation.createdAt).getTime();
      }

      // Save AI message
      aiMessage = await Message.create({
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
        content: aiMessage.content,
        senderType: 'ai',
        createdAt: aiMessage.createdAt,
      };
    } else if (senderType === 'customer') {
      // Customer talking while waiting or connected to agent
      conversation.unreadCountAgent += 1;
    } else if (senderType === 'agent') {
      conversation.unreadCountCustomer += 1;
    }

    await conversation.save();

    res.status(201).json({
      success: true,
      message: userMsg,
      aiMessage,
      conversation,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to process message.', error: err.message });
  }
});

module.exports = router;
