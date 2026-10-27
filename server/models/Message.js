const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    senderType: {
      type: String,
      enum: ['customer', 'agent', 'ai', 'system'],
      required: true,
    },
    senderId: {
      type: String,
      default: null,
    },
    senderName: {
      type: String,
      default: function () {
        if (this.senderType === 'ai') return 'SupportHub AI';
        if (this.senderType === 'customer') return 'Customer';
        if (this.senderType === 'agent') return 'Support Agent';
        return 'System';
      },
    },
    content: {
      type: String,
      required: [true, 'Message content is required'],
      trim: true,
    },
    messageType: {
      type: String,
      enum: ['text', 'suggestion', 'escalation_prompt', 'ticket_update', 'system'],
      default: 'text',
    },
    deliveryStatus: {
      type: String,
      enum: ['sent', 'delivered', 'read'],
      default: 'delivered',
    },
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

messageSchema.index({ conversationId: 1, createdAt: 1 });

module.exports = mongoose.model('Message', messageSchema);
