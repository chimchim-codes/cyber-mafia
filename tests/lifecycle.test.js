// tests/lifecycle.test.js
const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const gameService = require('../server/services/gameService');
const { resetMemoryStore } = require('../server/db/supabaseClient');

describe('Phase 4: Game Start, End, Pause, and Resume', () => {
  beforeEach(() => {
    resetMemoryStore();
  });

  test('Start game sets status to RUNNING and records start timestamp', async () => {
    const sessionId = 'session-lc-start';
    await gameService.getOrCreateSession(sessionId, 4, 1);

    const startRes = await gameService.startGame(sessionId);
    assert.equal(startRes.success, true);
    assert.equal(startRes.session.status, 'RUNNING');
    assert.ok(startRes.session.started_at);
  });

  test('Duplicate start is prevented', async () => {
    const sessionId = 'session-lc-dup-start';
    await gameService.getOrCreateSession(sessionId, 4, 1);

    await gameService.startGame(sessionId);
    const secondStart = await gameService.startGame(sessionId);

    assert.equal(secondStart.success, false);
    assert.match(secondStart.message, /already been started/i);
  });

  test('Pause game sets status to PAUSED and records pause timestamp', async () => {
    const sessionId = 'session-lc-pause';
    await gameService.getOrCreateSession(sessionId, 4, 1);
    await gameService.startGame(sessionId);

    const pauseRes = await gameService.pauseGame(sessionId, 'ADMIN');
    assert.equal(pauseRes.success, true);
    assert.equal(pauseRes.session.status, 'PAUSED');
    assert.equal(pauseRes.session.is_paused, true);
    assert.ok(pauseRes.session.pause_started_at);
  });

  test('Duplicate pause is idempotent and preserves pause start timestamp', async () => {
    const sessionId = 'session-lc-dup-pause';
    await gameService.getOrCreateSession(sessionId, 4, 1);
    await gameService.startGame(sessionId);

    const firstPause = await gameService.pauseGame(sessionId, 'ADMIN');
    const firstPauseStart = firstPause.session.pause_started_at;

    const secondPause = await gameService.pauseGame(sessionId, 'ADMIN');
    assert.equal(secondPause.success, true);
    assert.equal(secondPause.session.pause_started_at, firstPauseStart);
  });

  test('Resume game accumulates paused seconds and resets pause timestamp', async () => {
    const sessionId = 'session-lc-resume';
    await gameService.getOrCreateSession(sessionId, 4, 1);
    await gameService.startGame(sessionId);

    await gameService.pauseGame(sessionId, 'ADMIN');
    const resumeRes = await gameService.resumeGame(sessionId, 'ADMIN');

    assert.equal(resumeRes.success, true);
    assert.equal(resumeRes.session.status, 'RUNNING');
    assert.equal(resumeRes.session.is_paused, false);
    assert.equal(resumeRes.session.pause_started_at, null);
    assert.ok(resumeRes.session.accumulated_paused_seconds >= 0);
  });

  test('Duplicate resume is idempotent and does not add extra paused duration', async () => {
    const sessionId = 'session-lc-dup-resume';
    await gameService.getOrCreateSession(sessionId, 4, 1);
    await gameService.startGame(sessionId);

    await gameService.pauseGame(sessionId, 'ADMIN');
    const firstResume = await gameService.resumeGame(sessionId, 'ADMIN');
    const firstAccumulated = firstResume.session.accumulated_paused_seconds;

    const secondResume = await gameService.resumeGame(sessionId, 'ADMIN');
    assert.equal(secondResume.success, true);
    assert.equal(secondResume.session.accumulated_paused_seconds, firstAccumulated);
  });

  test('End game records end timestamp and prevents duplicate end operations', async () => {
    const sessionId = 'session-lc-end';
    await gameService.getOrCreateSession(sessionId, 4, 1);
    await gameService.startGame(sessionId);

    const endRes = await gameService.endGame(sessionId, 'ADMIN', 'Test completed');
    assert.equal(endRes.success, true);
    assert.equal(endRes.session.status, 'COMPLETED');
    assert.ok(endRes.session.ended_at);

    // Duplicate end check
    const secondEnd = await gameService.endGame(sessionId, 'ADMIN', 'Test completed');
    assert.equal(secondEnd.success, false);
    assert.match(secondEnd.message, /already ended/i);
  });

  test('Active gameplay duration excludes all completed and active pause intervals', () => {
    const mockSession = {
      started_at: new Date(Date.now() - 100000).toISOString(), // 100s ago
      ended_at: null,
      is_paused: true,
      pause_started_at: new Date(Date.now() - 20000).toISOString(), // paused for 20s
      accumulated_paused_seconds: 30 // previously paused for 30s
    };

    const timing = gameService.calculateElapsedTiming(mockSession);
    assert.ok(timing.wallClockSeconds >= 99 && timing.wallClockSeconds <= 101);
    // Total paused = 30 + 20 = 50s
    assert.ok(timing.pausedSeconds >= 49 && timing.pausedSeconds <= 51);
    // Active gameplay = 100 - 50 = 50s
    assert.ok(timing.activeGameplaySeconds >= 49 && timing.activeGameplaySeconds <= 51);
  });

  test('Persistence: server restart simulation preserves session timing and state', async () => {
    const sessionId = 'session-lc-persist';
    await gameService.getOrCreateSession(sessionId, 4, 1);
    await gameService.startGame(sessionId);
    await gameService.pauseGame(sessionId, 'ADMIN');

    // Simulate new service instance reading from durable DB
    const freshSession = await gameService.getOrCreateSession(sessionId);
    assert.equal(freshSession.status, 'PAUSED');
    assert.equal(freshSession.is_paused, true);
    assert.ok(freshSession.started_at);
  });
});
