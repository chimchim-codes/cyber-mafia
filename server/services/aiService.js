const OpenAI = require('openai');
const env = require('../config/env');
const { DEFAULT_SYSTEM_PROMPT } = require('../config/systemPrompt');
const { searchFAQs, formatFAQsForPrompt, recordFAQUsage } = require('./faqService');

let openaiClient = null;
if (env.OPENAI_API_KEY && env.OPENAI_API_KEY.trim().length > 0) {
  try {
    openaiClient = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    });
  } catch (err) {
    console.warn('⚠️ Could not initialize OpenAI client:', err.message);
  }
}

// Detection patterns
const ESCALATION_PATTERNS = [
  /\b(human|agent|representative|real person|speak to someone|talk to someone|live person|manager|operator|escalat\w*)\b/i,
  /\b(transfer me|connect me|connect with agent|need a person)\b/i,
  /\b(i want to speak to a human)\b/i,
];

const FRUSTRATION_PATTERNS = [
  /\b(angry|furious|terrible|horrible|scam|fraud|ridiculous|useless|incompetent|worst service|hate this|waste of time|lawyer|sue|complaint)\b/i,
  /\b(unacceptable|not helpful|stupid|awful|broken again)\b/i,
];

function isEscalationRequest(text) {
  if (!text) return false;
  return ESCALATION_PATTERNS.some(regex => regex.test(text));
}

function isCustomerFrustrated(text) {
  if (!text) return false;
  // Frustration keywords or shouting (all caps > 8 chars with punctuation)
  const hasKeywords = FRUSTRATION_PATTERNS.some(regex => regex.test(text));
  const isShouting = text.length > 8 && text === text.toUpperCase() && /[!A-Z]/.test(text);
  return hasKeywords || isShouting;
}

/**
 * Intelligent fallback responder when OpenAI is unavailable or keys not provided.
 */
function generateFallbackResponse(userMessage, matchedFAQs, isFrustrated, isEscalation) {
  const lowerMsg = userMessage.toLowerCase().trim();

  if (isEscalation) {
    return {
      content:
        "I understand you'd like to speak with a human support agent. I'm transferring your request to our live agent queue right away. An agent will be with you shortly!",
      messageType: 'escalation_prompt',
      shouldEscalate: true,
      promptEscalation: false,
      sentiment: 'neutral',
    };
  }

  if (isFrustrated) {
    return {
      content:
        "I'm truly sorry for the frustration this has caused. We value your time and want to make this right immediately. Would you like me to connect you with a live human support specialist who can look into your account directly?",
      messageType: 'escalation_prompt',
      shouldEscalate: false,
      promptEscalation: true,
      sentiment: 'frustrated',
    };
  }

  // Quick greetings
  if (/^(hi|hello|hey|good morning|good afternoon|good evening)\b/i.test(lowerMsg)) {
    return {
      content:
        "Hello! 👋 Welcome to SupportHub. How can I assist you today? You can ask about tracking orders, returns, refunds, payment options, or request a live agent.",
      messageType: 'text',
      shouldEscalate: false,
      promptEscalation: false,
      sentiment: 'positive',
    };
  }

  // Check matched FAQs
  if (matchedFAQs && matchedFAQs.length > 0) {
    const topFAQ = matchedFAQs[0];
    recordFAQUsage(topFAQ._id);
    return {
      content: `${topFAQ.answer}\n\nDoes this answer your question, or would you like more details?`,
      messageType: 'text',
      shouldEscalate: false,
      promptEscalation: false,
      matchedFaqId: topFAQ._id,
      sentiment: 'neutral',
    };
  }

  // Specific order lookup pattern
  if (/#ord-\d+|order\s*#?\s*\d+/i.test(lowerMsg)) {
    return {
      content:
        "I see your order reference. For security, specific tracking data is synced in your SupportHub account portal. You can check live tracking at supporthub.com/track or I can connect you to a live support agent who can verify your account. Would you like to connect to an agent?",
      messageType: 'escalation_prompt',
      shouldEscalate: false,
      promptEscalation: true,
      sentiment: 'neutral',
    };
  }

  // General fallback when AI cannot confidently answer
  return {
    content:
      "I want to make sure you get the exact right answer. Could you clarify what product or service this relates to? Alternatively, I can connect you with one of our human support agents right away.",
    messageType: 'suggestion',
    shouldEscalate: false,
    promptEscalation: true,
    sentiment: 'neutral',
  };
}

/**
 * Main AI response generator combining OpenAI API + FAQ Search + Empathy/Escalation Detection
 */
async function generateAIResponse({ conversation, recentMessages = [], userMessage }) {
  const isEscalation = isEscalationRequest(userMessage);
  const isFrustrated = isCustomerFrustrated(userMessage);

  // Search FAQs for relevant context
  const matchedFAQs = await searchFAQs(userMessage, 4);

  // If explicit escalation requested, shortcut directly to smooth escalation
  if (isEscalation) {
    return {
      content:
        "Certainly! I am connecting you with a human support agent now. Please hold on while I notify an available agent.",
      messageType: 'escalation_prompt',
      shouldEscalate: true,
      promptEscalation: false,
      matchedFaqId: null,
      sentiment: isFrustrated ? 'frustrated' : 'neutral',
    };
  }

  // If OpenAI client is available, attempt LLM completion
  if (openaiClient && env.OPENAI_API_KEY) {
    try {
      const faqContext = formatFAQsForPrompt(matchedFAQs);
      const systemInstruction = DEFAULT_SYSTEM_PROMPT
        .replace('{{FAQ_CONTEXT}}', faqContext)
        .replace('{{CONVERSATION_STATUS}}', conversation.status || 'AI Active');

      // Format previous context (limit to last 6 messages for token efficiency)
      const contextHistory = recentMessages.slice(-6).map(m => ({
        role: m.senderType === 'customer' ? 'user' : 'assistant',
        content: m.content,
      }));

      const messagesPayload = [
        { role: 'system', content: systemInstruction },
        ...contextHistory,
        { role: 'user', content: userMessage },
      ];

      const completion = await openaiClient.chat.completions.create({
        model: env.OPENAI_MODEL,
        messages: messagesPayload,
        temperature: 0.3,
        max_tokens: 350,
      });

      const responseText = completion.choices[0]?.message?.content || '';

      if (matchedFAQs.length > 0) {
        recordFAQUsage(matchedFAQs[0]._id);
      }

      return {
        content: responseText,
        messageType: isFrustrated ? 'escalation_prompt' : 'text',
        shouldEscalate: false,
        promptEscalation: isFrustrated,
        matchedFaqId: matchedFAQs[0]?._id || null,
        sentiment: isFrustrated ? 'frustrated' : 'neutral',
      };
    } catch (openaiErr) {
      console.warn('⚠️ OpenAI API call failed or rate limited, using intelligent fallback:', openaiErr.message);
      // Fall through to fallback engine below
    }
  }

  // Use intelligent rule-based / FAQ matcher fallback
  return generateFallbackResponse(userMessage, matchedFAQs, isFrustrated, isEscalation);
}

module.exports = {
  isEscalationRequest,
  isCustomerFrustrated,
  generateAIResponse,
};
