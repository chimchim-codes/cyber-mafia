const SupportTicket = require('../models/SupportTicket');
const Conversation = require('../models/Conversation');

async function createOrUpdateTicket({
  conversationId,
  customerId,
  customerName = 'Guest Customer',
  customerEmail = '',
  subject,
  description = '',
  priority = 'Medium',
  escalationReason = 'Customer escalated to human support',
}) {
  // Check if a ticket already exists for this conversation
  let ticket = await SupportTicket.findOne({ conversationId });

  if (ticket) {
    ticket.description = description || ticket.description;
    ticket.priority = priority || ticket.priority;
    ticket.escalationReason = escalationReason || ticket.escalationReason;
    if (customerEmail && !ticket.customerEmail) ticket.customerEmail = customerEmail;
    await ticket.save();
  } else {
    ticket = await SupportTicket.create({
      conversationId,
      customerId,
      customerName,
      customerEmail,
      subject: subject || `Support Request from ${customerName}`,
      description,
      priority,
      status: 'Open',
      escalationReason,
    });

    // Link back to conversation
    await Conversation.findByIdAndUpdate(conversationId, {
      ticketId: ticket._id,
      priority,
    });
  }

  return ticket;
}

async function updateTicketStatus(ticketId, status, agentId = null) {
  const updateData = { status };
  if (agentId) {
    updateData.assignedAgentId = agentId;
  }
  return SupportTicket.findByIdAndUpdate(ticketId, updateData, { new: true });
}

module.exports = {
  createOrUpdateTicket,
  updateTicketStatus,
};
