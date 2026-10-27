const express = require('express');
const FAQ = require('../models/FAQ');
const { authenticate, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

// GET /api/faqs - Retrieve all active FAQs with optional category or query filter
router.get('/', async (req, res) => {
  try {
    const { category, search, includeInactive } = req.query;
    const filter = {};

    if (!includeInactive) {
      filter.isActive = true;
    }

    if (category && category !== 'All') {
      filter.category = category;
    }

    if (search && search.trim().length > 0) {
      const regex = new RegExp(search.trim(), 'i');
      filter.$or = [{ question: regex }, { answer: regex }, { keywords: { $in: [regex] } }];
    }

    const faqs = await FAQ.find(filter).sort({ usageCount: -1, createdAt: -1 });
    res.json({ success: true, count: faqs.length, faqs });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve FAQs.', error: err.message });
  }
});

// GET /api/faqs/categories
router.get('/categories', async (req, res) => {
  try {
    const categories = ['Orders', 'Shipping', 'Returns', 'Refunds', 'Payments', 'Account', 'General'];
    res.json({ success: true, categories });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch categories.' });
  }
});

// POST /api/faqs - Create a new FAQ entry (Agent/Admin)
router.post('/', authenticate, requireRole('agent', 'admin'), async (req, res) => {
  try {
    const { question, answer, category = 'General', keywords = [], isActive = true } = req.body;

    if (!question || !answer) {
      return res.status(400).json({ success: false, message: 'Question and answer are required fields.' });
    }

    const keywordArray = Array.isArray(keywords)
      ? keywords
      : typeof keywords === 'string'
      ? keywords.split(',').map(k => k.trim()).filter(Boolean)
      : [];

    const newFAQ = await FAQ.create({
      question: question.trim(),
      answer: answer.trim(),
      category,
      keywords: keywordArray,
      isActive,
    });

    res.status(201).json({ success: true, message: 'FAQ article created successfully.', faq: newFAQ });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create FAQ article.', error: err.message });
  }
});

// PUT /api/faqs/:id - Update FAQ
router.put('/:id', authenticate, requireRole('agent', 'admin'), async (req, res) => {
  try {
    const { question, answer, category, keywords, isActive } = req.body;
    const update = {};

    if (question) update.question = question.trim();
    if (answer) update.answer = answer.trim();
    if (category) update.category = category;
    if (keywords !== undefined) {
      update.keywords = Array.isArray(keywords)
        ? keywords
        : keywords.split(',').map(k => k.trim()).filter(Boolean);
    }
    if (isActive !== undefined) update.isActive = isActive;

    const updatedFAQ = await FAQ.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!updatedFAQ) {
      return res.status(404).json({ success: false, message: 'FAQ article not found.' });
    }

    res.json({ success: true, message: 'FAQ article updated successfully.', faq: updatedFAQ });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update FAQ article.', error: err.message });
  }
});

// DELETE /api/faqs/:id - Delete FAQ
router.delete('/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const deleted = await FAQ.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'FAQ article not found.' });
    }
    res.json({ success: true, message: 'FAQ article deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete FAQ article.', error: err.message });
  }
});

module.exports = router;
