// tests/leaderboard.test.js
const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const gameService = require('../server/services/gameService');
const { resetMemoryStore } = require('../server/db/supabaseClient');

describe('Phase 3: Real-Time Leaderboard', () => {
  beforeEach(() => {
    resetMemoryStore();
  });

  test('Initial persisted leaderboard loads with correct default ranks', async () => {
    const sessionId = 'session-lb-init';
    await gameService.getOrCreateSession(sessionId, 4, 1);

    const leaderboard = await gameService.getLeaderboard(sessionId);
    assert.equal(leaderboard.length, 4);
    assert.equal(leaderboard[0].rank, 1);
    assert.equal(leaderboard[0].score, 0);
    assert.equal(leaderboard[0].completionStatus, 'ACTIVE');
  });

  test('Correct ranking when scores are updated', async () => {
    const sessionId = 'session-lb-rank';
    await gameService.getOrCreateSession(sessionId, 4, 1);

    // C01 gets 100 PTS
    await gameService.recordScoreEvent({
      sessionId,
      teamId: 'C01',
      levelId: 1,
      eventType: 'COMPROMISE_SUCCESS',
      scoreDelta: 100,
      idempotencyKey: 'score-c01-1'
    });

    // C03 gets 300 PTS
    await gameService.recordScoreEvent({
      sessionId,
      teamId: 'C03',
      levelId: 1,
      eventType: 'CORRECT_HACKER_ACCUSATION',
      scoreDelta: 300,
      idempotencyKey: 'score-c03-1'
    });

    // C02 gets 75 PTS
    await gameService.recordScoreEvent({
      sessionId,
      teamId: 'C02',
      levelId: 1,
      eventType: 'SOLVE_INVESTIGATION_CTF',
      scoreDelta: 75,
      idempotencyKey: 'score-c02-1'
    });

    const leaderboard = await gameService.getLeaderboard(sessionId);
    assert.equal(leaderboard[0].teamId, 'C03');
    assert.equal(leaderboard[0].score, 300);
    assert.equal(leaderboard[0].rank, 1);

    assert.equal(leaderboard[1].teamId, 'C01');
    assert.equal(leaderboard[1].score, 100);
    assert.equal(leaderboard[1].rank, 2);

    assert.equal(leaderboard[2].teamId, 'C02');
    assert.equal(leaderboard[2].score, 75);
    assert.equal(leaderboard[2].rank, 3);

    assert.equal(leaderboard[3].teamId, 'C04');
    assert.equal(leaderboard[3].score, 0);
    assert.equal(leaderboard[3].rank, 4);
  });

  test('Deterministic tie-breaking when scores are identical', async () => {
    const sessionId = 'session-lb-ties';
    await gameService.getOrCreateSession(sessionId, 3, 1);

    // Give both C01 and C02 identical 100 scores
    await gameService.recordScoreEvent({
      sessionId,
      teamId: 'C01',
      levelId: 1,
      eventType: 'COMPROMISE_SUCCESS',
      scoreDelta: 100,
      idempotencyKey: 'score-c01-tie'
    });

    await gameService.recordScoreEvent({
      sessionId,
      teamId: 'C02',
      levelId: 1,
      eventType: 'COMPROMISE_SUCCESS',
      scoreDelta: 100,
      idempotencyKey: 'score-c02-tie'
    });

    const leaderboard = await gameService.getLeaderboard(sessionId);
    assert.equal(leaderboard[0].score, 100);
    assert.equal(leaderboard[1].score, 100);

    // Check that ranks are deterministically assigned 1 and 2
    assert.equal(leaderboard[0].rank, 1);
    assert.equal(leaderboard[1].rank, 2);
    assert.ok(['C01', 'C02'].includes(leaderboard[0].teamId));
  });

  test('Session isolation: scores in session A do not leak into session B', async () => {
    const sessionA = 'session-lb-A';
    const sessionB = 'session-lb-B';

    await gameService.getOrCreateSession(sessionA, 2, 1);
    await gameService.getOrCreateSession(sessionB, 2, 1);

    await gameService.recordScoreEvent({
      sessionId: sessionA,
      teamId: 'C01',
      levelId: 1,
      eventType: 'COMPROMISE_SUCCESS',
      scoreDelta: 500,
      idempotencyKey: 'score-a-1'
    });

    const lbA = await gameService.getLeaderboard(sessionA);
    const lbB = await gameService.getLeaderboard(sessionB);

    assert.equal(lbA[0].score, 500);
    assert.equal(lbB[0].score, 0);
    assert.equal(lbB[1].score, 0);
  });

  test('Reconnection retains score and leaderboard rank', async () => {
    const sessionId = 'session-lb-recon';
    await gameService.getOrCreateSession(sessionId, 3, 1);

    await gameService.recordScoreEvent({
      sessionId,
      teamId: 'C02',
      levelId: 1,
      eventType: 'COMPROMISE_SUCCESS',
      scoreDelta: 150,
      idempotencyKey: 'score-recon-c02'
    });

    // Simulate browser reconnect
    const recon = await gameService.reconnectTeam(sessionId, 'C02');
    assert.equal(recon.team.score, 150);

    const leaderboard = await gameService.getLeaderboard(sessionId);
    assert.equal(leaderboard[0].teamId, 'C02');
    assert.equal(leaderboard[0].score, 150);
  });
});
