// tests/progress.test.js
const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const gameService = require('../server/services/gameService');
const { resetMemoryStore } = require('../server/db/supabaseClient');

describe('Phase 5: Automatic Progress Persistence', () => {
  beforeEach(() => {
    resetMemoryStore();
  });

  test('Automatic checkpoints created when score events are processed', async () => {
    const sessionId = 'session-prog-chk';
    await gameService.getOrCreateSession(sessionId, 4, 1);
    await gameService.startGame(sessionId);

    const result = await gameService.recordScoreEvent({
      sessionId,
      teamId: 'C01',
      levelId: 1,
      eventType: 'SOLVE_INVESTIGATION_CTF',
      scoreDelta: 75,
      idempotencyKey: 'idemp-prog-1'
    });

    assert.equal(result.success, true);
    assert.equal(result.newScore, 75);

    // Verify recovery snapshots were created
    const snapshots = await gameService.getSnapshotHistory(sessionId, 'C01', 1);
    assert.ok(snapshots.length >= 1);
    assert.equal(snapshots[0].score_at_snapshot, 75);
    assert.equal(snapshots[0].team_id, 'C01');
  });

  test('Duplicate challenge submissions are rejected idempotently', async () => {
    const sessionId = 'session-prog-dup';
    await gameService.getOrCreateSession(sessionId, 4, 1);
    await gameService.startGame(sessionId);

    const first = await gameService.recordScoreEvent({
      sessionId,
      teamId: 'C02',
      levelId: 1,
      eventType: 'SOLVE_INVESTIGATION_CTF',
      scoreDelta: 75,
      idempotencyKey: 'same-unique-key'
    });
    assert.equal(first.success, true);

    const duplicate = await gameService.recordScoreEvent({
      sessionId,
      teamId: 'C02',
      levelId: 1,
      eventType: 'SOLVE_INVESTIGATION_CTF',
      scoreDelta: 75,
      idempotencyKey: 'same-unique-key'
    });
    assert.equal(duplicate.success, false);
    assert.equal(duplicate.duplicate, true);

    // Score remains 75 (not 150)
    const score = await gameService.recalculateTeamScore(sessionId, 'C02');
    assert.equal(score, 75);
  });

  test('Stale-state rejection: actions rejected when match is paused or completed', async () => {
    const sessionId = 'session-prog-stale';
    await gameService.getOrCreateSession(sessionId, 4, 1);
    await gameService.startGame(sessionId);
    await gameService.pauseGame(sessionId, 'ADMIN');

    await assert.rejects(
      async () => {
        await gameService.recordScoreEvent({
          sessionId,
          teamId: 'C01',
          levelId: 1,
          eventType: 'COMPROMISE_SUCCESS',
          scoreDelta: 100,
          idempotencyKey: 'pause-reject-key'
        });
      },
      /match is currently PAUSED/i
    );

    await gameService.resumeGame(sessionId, 'ADMIN');
    await gameService.endGame(sessionId, 'ADMIN');

    await assert.rejects(
      async () => {
        await gameService.recordScoreEvent({
          sessionId,
          teamId: 'C01',
          levelId: 1,
          eventType: 'COMPROMISE_SUCCESS',
          scoreDelta: 100,
          idempotencyKey: 'completed-reject-key'
        });
      },
      /match is already COMPLETED/i
    );
  });

  test('Reconnection loads latest valid authoritative progress without data loss', async () => {
    const sessionId = 'session-prog-recon';
    await gameService.getOrCreateSession(sessionId, 4, 1);
    await gameService.startGame(sessionId);

    await gameService.recordScoreEvent({
      sessionId,
      teamId: 'C03',
      levelId: 1,
      eventType: 'SOLVE_INVESTIGATION_CTF',
      scoreDelta: 75,
      idempotencyKey: 'recon-score-1'
    });

    const recon = await gameService.reconnectTeam(sessionId, 'C03');
    assert.equal(recon.team.id, 'C03');
    assert.equal(recon.team.score, 75);
    assert.equal(recon.currentProgress.level_id, 1);
  });
});
