const mongoose = require('mongoose');

const faqSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: [true, 'FAQ question is required'],
      trim: true,
    },
    answer: {
      type: String,
      required: [true, 'FAQ answer is required'],
      trim: true,
    },
    category: {
      type: String,
      enum: ['Orders', 'Shipping', 'Returns', 'Refunds', 'Payments', 'Account', 'General'],
      default: 'General',
      index: true,
    },
    keywords: {
      type: [String],
      default: [],
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    usageCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

faqSchema.index({ question: 'text', answer: 'text', keywords: 'text' });

module.exports = mongoose.model('FAQ', faqSchema);
