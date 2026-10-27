const mongoose = require('mongoose');

const supportTicketSchema = new mongoose.Schema(
  {
    ticketNumber: {
      type: String,
      unique: true,
      index: true,
    },
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    customerId: {
      type: String,
      required: true,
    },
    customerName: {
      type: String,
      default: 'Guest Customer',
    },
    customerEmail: {
      type: String,
      default: '',
    },
    subject: {
      type: String,
      required: [true, 'Ticket subject is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Urgent'],
      default: 'Medium',
      index: true,
    },
    status: {
      type: String,
      enum: ['Open', 'In Progress', 'Waiting on Customer', 'Resolved', 'Closed'],
      default: 'Open',
      index: true,
    },
    assignedAgentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    escalationReason: {
      type: String,
      default: 'Direct customer escalation request',
    },
  },
  {
    timestamps: true,
  }
);

// Auto-generate human-friendly ticket numbers before saving
supportTicketSchema.pre('validate', async function () {
  if (!this.ticketNumber) {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const datePrefix = new Date().toISOString().slice(2, 7).replace('-', '');
    this.ticketNumber = `TICK-${datePrefix}-${randomSuffix}`;
  }
});

module.exports = mongoose.model('SupportTicket', supportTicketSchema);
