const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    customerId: {
      type: String,
      required: true,
      index: true,
    },
    customerName: {
      type: String,
      default: 'Guest Customer',
      trim: true,
    },
    customerEmail: {
      type: String,
      lowercase: true,
      trim: true,
    },
    assignedAgentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: ['AI Active', 'Waiting for Agent', 'Agent Connected', 'Resolved', 'Closed'],
      default: 'AI Active',
      index: true,
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Urgent'],
      default: 'Medium',
      index: true,
    },
    resolvedBy: {
      type: String,
      enum: ['AI', 'Agent', null],
      default: null,
    },
    ticketId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SupportTicket',
      default: null,
    },
    lastMessage: {
      content: { type: String, default: '' },
      senderType: { type: String, default: 'system' },
      createdAt: { type: Date, default: Date.now },
    },
    unreadCountAgent: {
      type: Number,
      default: 0,
    },
    unreadCountCustomer: {
      type: Number,
      default: 0,
    },
    firstResponseTimeMs: {
      type: Number,
      default: null,
    },
    resolutionTimeMs: {
      type: Number,
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

conversationSchema.index({ status: 1, createdAt: -1 });
conversationSchema.index({ customerId: 1, status: 1 });

module.exports = mongoose.model('Conversation', conversationSchema);
