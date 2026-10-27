const User = require('../models/User');
const FAQ = require('../models/FAQ');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const SupportTicket = require('../models/SupportTicket');

const SAMPLE_FAQS = [
  {
    category: 'Orders',
    question: 'Where is my order and how can I track it?',
    answer:
      'You can track your order at any time using your Order Confirmation email or via our Tracking Portal at supporthub.com/track. Enter your order number (e.g. #ORD-8821) and billing zip code. Orders typically process within 24 hours and tracking updates will appear as soon as the courier scans your package.',
    keywords: ['order', 'track', 'where is my order', 'tracking', 'package', 'status', 'delivery'],
    isActive: true,
  },
  {
    category: 'Orders',
    question: 'Can I modify or cancel my order after placing it?',
    answer:
      'Orders can be modified or canceled within 60 minutes of placement directly from your account order history. After 60 minutes, orders enter fulfillment and cannot be canceled, but you can easily return unwanted items for free once delivered.',
    keywords: ['cancel order', 'modify order', 'change address', 'edit order', 'cancellation'],
    isActive: true,
  },
  {
    category: 'Shipping',
    question: 'What are your standard shipping options and delivery timelines?',
    answer:
      'We offer three shipping speeds within the continental US: Standard Shipping (3-5 business days, free on orders over $50), Expedited Priority (2 business days, $9.99), and Overnight Express (1 business day, $19.99). Delivery times begin after the 24-hour processing window.',
    keywords: ['shipping', 'delivery', 'timelines', 'rates', 'expedited', 'overnight', 'how long'],
    isActive: true,
  },
  {
    category: 'Shipping',
    question: 'Do you offer international shipping and who pays customs duties?',
    answer:
      'Yes, we ship to over 65 countries worldwide! International shipping takes 7-14 business days via DHL Express. All import taxes and customs duties are calculated and collected at checkout (DDP - Delivered Duty Paid), so there are zero surprise fees upon arrival.',
    keywords: ['international', 'customs', 'duties', 'worldwide', 'global shipping', 'dhl'],
    isActive: true,
  },
  {
    category: 'Returns',
    question: 'What is your return policy and how do I start a return?',
    answer:
      'We offer a 30-day hassle-free return window for all items in original, unused condition with tags attached. Start your return at supporthub.com/returns by entering your order number. Once submitted, a prepaid QR code and printable shipping label will be generated instantly.',
    keywords: ['return', 'return policy', 'how to return', '30 days', 'send back', 'exchange'],
    isActive: true,
  },
  {
    category: 'Returns',
    question: 'How do I print a prepaid return shipping label?',
    answer:
      'Once you initiate a return in the Returns Portal, we email you a printable return label. Alternatively, you can show the digital QR code on your phone at any FedEx or UPS drop-off location and they will package and label it for you free of charge.',
    keywords: ['return label', 'prepaid label', 'qr code', 'ups', 'fedex', 'drop off'],
    isActive: true,
  },
  {
    category: 'Refunds',
    question: 'How long does it take for a refund to process?',
    answer:
      'Once our warehouse inspects your returned item (1-2 business days), your refund is immediately processed back to your original payment method. Depending on your bank or credit card issuer, funds typically reflect in your account within 3 to 5 business days.',
    keywords: ['refund', 'money back', 'how long refund', 'refund timeline', 'reimbursement'],
    isActive: true,
  },
  {
    category: 'Refunds',
    question: 'Can I receive my refund as instant Store Credit instead of bank refund?',
    answer:
      'Yes! If you select Store Credit when requesting your return, your SupportHub account is credited immediately upon drop-off scan, plus you receive a bonus +10% promotional credit toward your next purchase.',
    keywords: ['store credit', 'instant refund', 'credit balance', 'bonus credit'],
    isActive: true,
  },
  {
    category: 'Payments',
    question: 'I need help with a payment: what payment methods do you accept?',
    answer:
      'We accept Visa, MasterCard, American Express, Discover, PayPal, Apple Pay, Google Pay, and Klarna Pay-in-4 installment plans. All transactions are securely encrypted with 256-bit SSL and PCI-DSS Level 1 compliance.',
    keywords: ['payment', 'pay', 'credit card', 'paypal', 'apple pay', 'klarna', 'payment methods'],
    isActive: true,
  },
  {
    category: 'Payments',
    question: 'Why was my credit card or payment transaction declined?',
    answer:
      'Payment declines usually happen due to: 1) Billing address zip code mismatching the bank records, 2) Card expiration date or CVV typos, or 3) Your bank automated fraud detection flag. We recommend verifying your billing info or contacting your bank to authorize SupportHub transactions.',
    keywords: ['payment declined', 'card failed', 'transaction error', 'billing address', 'declined'],
    isActive: true,
  },
  {
    category: 'Account',
    question: 'How do I reset my password if I cannot log in?',
    answer:
      'To reset your password, visit supporthub.com/forgot-password, enter your registered email address, and click "Send Reset Link". You will receive an email within 2 minutes with a secure one-time link valid for 1 hour. Be sure to check your spam or promotions folder.',
    keywords: ['password reset', 'forgot password', 'cannot login', 'reset password', 'account access'],
    isActive: true,
  },
  {
    category: 'Account',
    question: 'How do I enable two-factor authentication (2FA) for extra account security?',
    answer:
      'Log into your account, navigate to Account Settings > Security, and toggle on Two-Factor Authentication. You can use standard authenticator apps like Google Authenticator, Authy, or 1Password to scan the displayed QR code.',
    keywords: ['2fa', 'two factor', 'security', 'authenticator', 'protect account'],
    isActive: true,
  },
  {
    category: 'General',
    question: 'I want to speak to a human agent: how can I reach live support?',
    answer:
      'Our live human support team is ready to help! You can ask right here in the chat to speak with an agent, or click the "Transfer to Agent" button at any time. Live agents are available Monday through Friday 8am-8pm EST and Saturdays 9am-5pm EST. If agents are busy, we will immediately generate a high-priority support ticket.',
    keywords: ['human', 'agent', 'speak to human', 'real person', 'representative', 'customer care', 'escalate'],
    isActive: true,
  },
];

async function seedDatabase() {
  try {
    // 1. Seed Users (Admin & Support Agents)
    const existingUsers = await User.countDocuments();
    let adminUser, agent1, agent2;

    if (existingUsers === 0) {
      console.log('🌱 Seeding administrative and support agent users...');
      const adminPasswordHash = await User.hashPassword('AdminPass123!');
      const agentPasswordHash = await User.hashPassword('AgentPass123!');

      adminUser = await User.create({
        name: 'Jordan Hayes (Admin)',
        email: 'admin@supporthub.com',
        passwordHash: adminPasswordHash,
        role: 'admin',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      });

      agent1 = await User.create({
        name: 'Sarah Connor',
        email: 'sarah.agent@supporthub.com',
        passwordHash: agentPasswordHash,
        role: 'agent',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
        isOnline: true,
      });

      agent2 = await User.create({
        name: 'Alex Rivera',
        email: 'alex.support@supporthub.com',
        passwordHash: agentPasswordHash,
        role: 'agent',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
        isOnline: true,
      });

      console.log('✅ Users seeded: admin@supporthub.com, sarah.agent@supporthub.com, alex.support@supporthub.com');
    } else {
      adminUser = await User.findOne({ role: 'admin' });
      agent1 = await User.findOne({ email: 'sarah.agent@supporthub.com' }) || await User.findOne({ role: 'agent' });
    }

    // 2. Seed FAQs
    const existingFaqs = await FAQ.countDocuments();
    if (existingFaqs === 0) {
      console.log('🌱 Seeding FAQ knowledge base...');
      await FAQ.insertMany(SAMPLE_FAQS);
      console.log(`✅ ${SAMPLE_FAQS.length} FAQs seeded successfully.`);
    }

    // 3. Seed sample historical conversations & tickets for rich analytics
    const existingConversations = await Conversation.countDocuments();
    if (existingConversations === 0 && agent1) {
      console.log('🌱 Seeding historical conversations for real analytics...');

      // Sample 1: Resolved by AI
      const convAI = await Conversation.create({
        customerId: 'cust_seed_01',
        customerName: 'Elena Rostova',
        customerEmail: 'elena@example.com',
        status: 'Resolved',
        priority: 'Low',
        resolvedBy: 'AI',
        firstResponseTimeMs: 1200,
        resolutionTimeMs: 45000,
        resolvedAt: new Date(Date.now() - 3600000 * 4),
        lastMessage: {
          content: 'Thank you, the return policy answer explained everything perfectly!',
          senderType: 'customer',
          createdAt: new Date(Date.now() - 3600000 * 4),
        },
      });

      await Message.create([
        {
          conversationId: convAI._id,
          senderType: 'customer',
          senderName: 'Elena Rostova',
          content: 'What is your return policy and how do I start a return?',
          messageType: 'text',
          createdAt: new Date(Date.now() - 3600000 * 4 - 60000),
        },
        {
          conversationId: convAI._id,
          senderType: 'ai',
          senderName: 'SupportHub AI',
          content:
            'We offer a 30-day hassle-free return window for all items in original condition! You can start a return online at supporthub.com/returns.',
          messageType: 'text',
          createdAt: new Date(Date.now() - 3600000 * 4 - 45000),
        },
        {
          conversationId: convAI._id,
          senderType: 'customer',
          senderName: 'Elena Rostova',
          content: 'Thank you, the return policy answer explained everything perfectly!',
          messageType: 'text',
          createdAt: new Date(Date.now() - 3600000 * 4),
        },
      ]);

      // Sample 2: Resolved by Human Agent
      const convAgent = await Conversation.create({
        customerId: 'cust_seed_02',
        customerName: 'Marcus Vance',
        customerEmail: 'marcus.v@example.com',
        assignedAgentId: agent1._id,
        status: 'Resolved',
        priority: 'High',
        resolvedBy: 'Agent',
        firstResponseTimeMs: 1400,
        resolutionTimeMs: 180000,
        resolvedAt: new Date(Date.now() - 3600000 * 2),
        lastMessage: {
          content: 'I have updated your shipping address to Suite 400. Have a wonderful day!',
          senderType: 'agent',
          createdAt: new Date(Date.now() - 3600000 * 2),
        },
      });

      const ticket1 = await SupportTicket.create({
        conversationId: convAgent._id,
        customerId: 'cust_seed_02',
        customerName: 'Marcus Vance',
        customerEmail: 'marcus.v@example.com',
        subject: 'Urgent address correction for Order #ORD-9912',
        description: 'Customer entered incorrect suite number during checkout. Needs update before courier pickup.',
        priority: 'High',
        status: 'Resolved',
        assignedAgentId: agent1._id,
        escalationReason: 'Customer requested human agent assistance for address modification',
      });

      convAgent.ticketId = ticket1._id;
      await convAgent.save();

      // Sample 3: Currently Waiting for Agent (Escalated)
      const convWaiting = await Conversation.create({
        customerId: 'cust_seed_03',
        customerName: 'Sophia Lin',
        customerEmail: 'sophia.lin@example.com',
        status: 'Waiting for Agent',
        priority: 'Urgent',
        unreadCountAgent: 1,
        lastMessage: {
          content: 'My payment was charged twice but I received an error page! Please connect me to a human agent.',
          senderType: 'customer',
          createdAt: new Date(Date.now() - 600000),
        },
      });

      const ticketWaiting = await SupportTicket.create({
        conversationId: convWaiting._id,
        customerId: 'cust_seed_03',
        customerName: 'Sophia Lin',
        customerEmail: 'sophia.lin@example.com',
        subject: 'Double charge inquiry on payment failure',
        description: 'Customer reports duplicated pending transaction on card. Urgent billing review requested.',
        priority: 'Urgent',
        status: 'Open',
        escalationReason: 'Customer requested human agent for double billing issue',
      });

      convWaiting.ticketId = ticketWaiting._id;
      await convWaiting.save();

      console.log('✅ Sample historical data seeded with real metric tracking.');
    }
  } catch (err) {
    console.error('Error during database seed:', err);
  }
}

module.exports = {
  SAMPLE_FAQS,
  seedDatabase,
};
