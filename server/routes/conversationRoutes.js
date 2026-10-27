const express = require('express');
const { v4: uuidv4 } = require('uuid');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const SupportTicket = require('../models/SupportTicket');
const { authenticate, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

const WELCOME_MESSAGE = "Hi there! 👋 Welcome to SupportHub. I'm your AI support assistant. How can I help you today?";

// POST /api/conversations - Start or resume customer conversation
router.post('/', async (req, res) => {
  try {
    const { customerId = uuidv4(), customerName = 'Guest Customer', customerEmail = '' } = req.body;

    // Check if there is an active conversation for this customer
    let conversation = await Conversation.findOne({
      customerId,
      status: { $in: ['AI Active', 'Waiting for Agent', 'Agent Connected'] },
    }).populate('assignedAgentId', 'name email avatar role');

    let isNew = false;
    if (!conversation) {
      conversation = await Conversation.create({
        customerId,
        customerName,
        customerEmail,
        status: 'AI Active',
        priority: 'Medium',
      });
      isNew = true;

      // Create welcome message
      await Message.create({
        conversationId: conversation._id,
        senderType: 'ai',
        senderName: 'SupportHub AI',
        content: WELCOME_MESSAGE,
        messageType: 'suggestion',
        meta: {
          quickQuestions: [
            'Where is my order?',
            'How do I reset my password?',
            'I need help with a payment.',
            'I want to speak to a human agent.',
          ],
        },
      });

      conversation.lastMessage = {
        content: WELCOME_MESSAGE,
        senderType: 'ai',
        createdAt: new Date(),
      };
      await conversation.save();
    }

    res.status(isNew ? 201 : 200).json({
      success: true,
      conversation,
      isNew,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to initialize conversation.', error: err.message });
  }
});

// GET /api/conversations - List conversations (for Agents and Admins)
router.get('/', authenticate, requireRole('agent', 'admin'), async (req, res) => {
  try {
    const { status, priority, search, page = 1, limit = 50 } = req.query;
    const query = {};

    if (status && status !== 'All') {
      query.status = status;
    }
    if (priority && priority !== 'All') {
      query.priority = priority;
    }
    if (search && search.trim().length > 0) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { customerName: searchRegex },
        { customerEmail: searchRegex },
        { 'lastMessage.content': searchRegex },
      ];
    }

    const total = await Conversation.countDocuments(query);
    const conversations = await Conversation.find(query)
      .populate('assignedAgentId', 'name email avatar role')
      .populate('ticketId')
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({
      success: true,
      conversations,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve conversations.', error: err.message });
  }
});

// GET /api/conversations/:id - Retrieve conversation details and full message history
router.get('/:id', async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id)
      .populate('assignedAgentId', 'name email avatar role')
      .populate('ticketId');

    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found.' });
    }

    const messages = await Message.find({ conversationId: conversation._id }).sort({ createdAt: 1 });

    res.json({
      success: true,
      conversation,
      messages,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch conversation.', error: err.message });
  }
});

// PATCH /api/conversations/:id/status - Update conversation status
router.patch('/:id/status', authenticate, requireRole('agent', 'admin'), async (req, res) => {
  try {
    const { status, resolvedBy } = req.body;
    const validStatuses = ['AI Active', 'Waiting for Agent', 'Agent Connected', 'Resolved', 'Closed'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: `Invalid status: ${status}` });
    }

    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found.' });
    }

    conversation.status = status;

    if (status === 'Resolved' || status === 'Closed') {
      conversation.resolvedAt = new Date();
      conversation.resolvedBy = resolvedBy || (req.user?.role === 'agent' ? 'Agent' : 'AI');
      if (!conversation.resolutionTimeMs) {
        conversation.resolutionTimeMs = Date.now() - new Date(conversation.createdAt).getTime();
      }

      // Update associated ticket if exists
      if (conversation.ticketId) {
        await SupportTicket.findByIdAndUpdate(conversation.ticketId, {
          status: status === 'Resolved' ? 'Resolved' : 'Closed',
        });
      }
    }

    await conversation.save();

    // Create system message
    await Message.create({
      conversationId: conversation._id,
      senderType: 'system',
      content: `Conversation status updated to "${status}" by ${req.user.name}.`,
      messageType: 'system',
    });

    res.json({
      success: true,
      message: `Status updated to ${status}.`,
      conversation,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update status.', error: err.message });
  }
});

// PATCH /api/conversations/:id/assign - Assign or accept conversation
router.patch('/:id/assign', authenticate, requireRole('agent', 'admin'), async (req, res) => {
  try {
    const agentId = req.body.agentId || req.user._id;

    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found.' });
    }

    conversation.assignedAgentId = agentId;
    conversation.status = 'Agent Connected';
    await conversation.save();

    // Update ticket if present
    if (conversation.ticketId) {
      await SupportTicket.findByIdAndUpdate(conversation.ticketId, {
        assignedAgentId: agentId,
        status: 'In Progress',
      });
    }

    // System announcement message
    await Message.create({
      conversationId: conversation._id,
      senderType: 'system',
      content: `${req.user.name} has joined the conversation to assist you.`,
      messageType: 'system',
    });

    const updated = await Conversation.findById(conversation._id).populate('assignedAgentId', 'name email avatar role');

    res.json({
      success: true,
      message: 'Conversation assigned successfully.',
      conversation: updated,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to assign conversation.', error: err.message });
  }
});

// PATCH /api/conversations/:id/priority
router.patch('/:id/priority', authenticate, requireRole('agent', 'admin'), async (req, res) => {
  try {
    const { priority } = req.body;
    if (!['Low', 'Medium', 'High', 'Urgent'].includes(priority)) {
      return res.status(400).json({ success: false, message: 'Invalid priority level.' });
    }

    const conversation = await Conversation.findByIdAndUpdate(
      req.params.id,
      { priority },
      { new: true }
    );

    if (conversation && conversation.ticketId) {
      await SupportTicket.findByIdAndUpdate(conversation.ticketId, { priority });
    }

    res.json({ success: true, conversation });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update priority.', error: err.message });
  }
});

// DELETE /api/conversations/:id - Clear chat or reset session
router.delete('/:id', async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found.' });
    }

    conversation.status = 'Closed';
    conversation.resolvedAt = new Date();
    await conversation.save();

    res.json({
      success: true,
      message: 'Conversation closed successfully.',
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to clear conversation.', error: err.message });
  }
});

module.exports = router;
