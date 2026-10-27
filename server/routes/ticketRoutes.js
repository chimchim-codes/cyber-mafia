const express = require('express');
const SupportTicket = require('../models/SupportTicket');
const Conversation = require('../models/Conversation');
const { authenticate, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

// GET /api/tickets - List all tickets with filtering
router.get('/', authenticate, requireRole('agent', 'admin'), async (req, res) => {
  try {
    const { status, priority, search } = req.query;
    const filter = {};

    if (status && status !== 'All') filter.status = status;
    if (priority && priority !== 'All') filter.priority = priority;
    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { ticketNumber: searchRegex },
        { customerName: searchRegex },
        { customerEmail: searchRegex },
        { subject: searchRegex },
      ];
    }

    const tickets = await SupportTicket.find(filter)
      .populate('assignedAgentId', 'name email avatar')
      .populate('conversationId', 'status customerName customerEmail')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: tickets.length, tickets });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve tickets.', error: err.message });
  }
});

// POST /api/tickets - Create a new support ticket
router.post('/', async (req, res) => {
  try {
    const { conversationId, customerId, customerName, customerEmail, subject, description, priority, escalationReason } = req.body;

    if (!conversationId || !subject) {
      return res.status(400).json({ success: false, message: 'Conversation ID and subject are required.' });
    }

    const ticket = await SupportTicket.create({
      conversationId,
      customerId: customerId || 'guest',
      customerName: customerName || 'Guest Customer',
      customerEmail: customerEmail || '',
      subject: subject.trim(),
      description: description ? description.trim() : '',
      priority: priority || 'Medium',
      status: 'Open',
      escalationReason: escalationReason || 'Customer support form submission',
    });

    await Conversation.findByIdAndUpdate(conversationId, {
      ticketId: ticket._id,
      priority: ticket.priority,
      status: 'Waiting for Agent',
    });

    res.status(201).json({ success: true, message: 'Support ticket created.', ticket });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create ticket.', error: err.message });
  }
});

// PATCH /api/tickets/:id - Update status, priority, or assignee
router.patch('/:id', authenticate, requireRole('agent', 'admin'), async (req, res) => {
  try {
    const { status, priority, assignedAgentId } = req.body;
    const update = {};

    if (status) update.status = status;
    if (priority) update.priority = priority;
    if (assignedAgentId !== undefined) update.assignedAgentId = assignedAgentId;

    const ticket = await SupportTicket.findByIdAndUpdate(req.params.id, update, { new: true })
      .populate('assignedAgentId', 'name email avatar')
      .populate('conversationId');

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found.' });
    }

    // If ticket resolved/closed, also sync conversation
    if (status === 'Resolved' || status === 'Closed') {
      await Conversation.findByIdAndUpdate(ticket.conversationId, {
        status,
        resolvedAt: new Date(),
      });
    }

    res.json({ success: true, message: 'Ticket updated successfully.', ticket });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update ticket.', error: err.message });
  }
});

module.exports = router;
