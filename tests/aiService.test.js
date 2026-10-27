const test = require('node:test');
const assert = require('node:assert/strict');
const { isEscalationRequest, isCustomerFrustrated, generateAIResponse } = require('../server/services/aiService');

test('AI Service - Escalation detection', () => {
  assert.equal(isEscalationRequest('I want to speak to a human agent'), true);
  assert.equal(isEscalationRequest('Can you transfer me to a real person?'), true);
  assert.equal(isEscalationRequest('I need an agent right now'), true);
  assert.equal(isEscalationRequest('Please escalate this issue to your supervisor'), true);
  assert.equal(isEscalationRequest('Where is my package?'), false);
  assert.equal(isEscalationRequest('How do I reset my password?'), false);
});

test('AI Service - Frustration detection', () => {
  assert.equal(isCustomerFrustrated('This service is completely useless and terrible!'), true);
  assert.equal(isCustomerFrustrated('I AM SO ANGRY THIS IS A SCAM!!!'), true);
  assert.equal(isCustomerFrustrated('THIS IS UNACCEPTABLE!'), true);
  assert.equal(isCustomerFrustrated('Hello, could you help me check my return status?'), false);
  assert.equal(isCustomerFrustrated('Thank you very much'), false);
});

test('AI Service - Intelligent fallback generates helpful answers', async () => {
  const dummyConv = { status: 'AI Active' };
  
  // Test greeting
  const greetingRes = await generateAIResponse({
    conversation: dummyConv,
    recentMessages: [],
    userMessage: 'Hello there!',
  });
  assert.ok(greetingRes.content.includes('Welcome to SupportHub'));
  assert.equal(greetingRes.shouldEscalate, false);

  // Test explicit escalation
  const escalationRes = await generateAIResponse({
    conversation: dummyConv,
    recentMessages: [],
    userMessage: 'I want to speak with a human support agent immediately',
  });
  assert.equal(escalationRes.shouldEscalate, true);
  assert.equal(escalationRes.messageType, 'escalation_prompt');

  // Test frustration
  const frustrationRes = await generateAIResponse({
    conversation: dummyConv,
    recentMessages: [],
    userMessage: 'This is ridiculous, my order is missing and you are useless!',
  });
  assert.equal(frustrationRes.promptEscalation, true);
  assert.equal(frustrationRes.sentiment, 'frustrated');
});
