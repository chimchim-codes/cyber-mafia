const FAQ = require('../models/FAQ');
const mongoose = require('mongoose');
const { SAMPLE_FAQS } = require('../db/seed');

async function searchFAQs(queryText, limit = 5) {
  if (!queryText || queryText.trim().length === 0) {
    if (mongoose.connection.readyState !== 1) {
      return SAMPLE_FAQS.slice(0, limit);
    }
    return FAQ.find({ isActive: true }).limit(limit);
  }

  const cleanQuery = queryText.toLowerCase().trim();
  const words = cleanQuery.split(/\s+/).filter(w => w.length > 2);

  // If DB not connected, search static sample FAQs
  if (mongoose.connection.readyState !== 1) {
    const matched = SAMPLE_FAQS.filter(faq => {
      const q = faq.question.toLowerCase();
      const a = faq.answer.toLowerCase();
      const hasWord = words.some(w => q.includes(w) || a.includes(w) || faq.keywords.includes(w));
      return hasWord;
    });
    return (matched.length > 0 ? matched : SAMPLE_FAQS).slice(0, limit);
  }

  // 1. Keyword or exact word match
  const keywordMatches = await FAQ.find({
    isActive: true,
    $or: [
      { keywords: { $in: words } },
      { question: { $regex: words.join('|'), $options: 'i' } },
      { answer: { $regex: words.join('|'), $options: 'i' } },
    ],
  }).limit(limit);

  if (keywordMatches.length > 0) {
    return keywordMatches;
  }

  // 2. Fallback to all active FAQs
  return FAQ.find({ isActive: true }).limit(limit);
}

async function recordFAQUsage(faqId) {
  try {
    await FAQ.findByIdAndUpdate(faqId, { $inc: { usageCount: 1 } });
  } catch (err) {
    console.error('Error recording FAQ usage:', err.message);
  }
}

function formatFAQsForPrompt(faqs) {
  if (!faqs || faqs.length === 0) {
    return 'No specific FAQ articles matched. Provide standard SupportHub general policy guidance.';
  }

  return faqs
    .map(
      (f, idx) =>
        `[FAQ #${idx + 1} - Category: ${f.category}]\nQ: ${f.question}\nA: ${f.answer}`
    )
    .join('\n\n');
}

module.exports = {
  searchFAQs,
  recordFAQUsage,
  formatFAQsForPrompt,
};
