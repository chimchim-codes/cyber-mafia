// tests/recovery.test.js
const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const gameService = require('../server/services/gameService');
const { resetMemoryStore, getServiceClient } = require('../server/db/supabaseClient');

describe('Phase 6: Administrative Recovery Snapshots & Resets', () => {
  beforeEach(() => {
    resetMemoryStore();
  });

  test('Snapshot creation and history listing by squad and level', async () => {
    const sessionId = 'session-rec-hist';
    await gameService.getOrCreateSession(sessionId, 4, 1);
    await gameService.startGame(sessionId);

    await gameService.saveProgressCheckpoint(sessionId, 'C01', 1, 'Manual Checkpoint 1');
    await gameService.saveProgressCheckpoint(sessionId, 'C01', 1, 'Manual Checkpoint 2');

    const history = await gameService.getSnapshotHistory(sessionId, 'C01', 1);
    assert.equal(history.length, 2);
    assert.equal(history[0].reason, 'Manual Checkpoint 2');
    assert.equal(history[1].reason, 'Manual Checkpoint 1');
  });

  test('Atomic snapshot restoration with score reconciliation', async () => {
    const sessionId = 'session-rec-restore';
    await gameService.getOrCreateSession(sessionId, 4, 1);
    await gameService.startGame(sessionId);

    // Initial score 0
    const { snapshot: snap1 } = await gameService.saveProgressCheckpoint(sessionId, 'C01', 1, 'Initial Snapshot');

    // Score changed to +100
    await gameService.recordScoreEvent({
      sessionId,
      teamId: 'C01',
      levelId: 1,
      eventType: 'COMPROMISE_SUCCESS',
      scoreDelta: 100,
      idempotencyKey: 'c01-score-100'
    });

    const teamBeforeRestore = await gameService.recalculateTeamScore(sessionId, 'C01');
    assert.equal(teamBeforeRestore, 100);

    // Restore snap1 (where score was 0)
    const restoreRes = await gameService.restoreSnapshot({
      sessionId,
      snapshotId: snap1.id,
      adminIdentity: 'CHIEF_ADMIN',
      reason: 'Rollback to initial valid state'
    });

    assert.equal(restoreRes.success, true);
    assert.equal(restoreRes.newScore, 0);
    assert.equal(restoreRes.scoreAdjustment, -100);

    const teamAfterRestore = await gameService.recalculateTeamScore(sessionId, 'C01');
    assert.equal(teamAfterRestore, 0);
  });

  test('Isolation between squads: restoring team C01 does not modify team C02', async () => {
    const sessionId = 'session-rec-isolation';
    await gameService.getOrCreateSession(sessionId, 4, 1);
    await gameService.startGame(sessionId);

    // C01 has 0 pts, C02 has 200 pts
    const { snapshot: snapC01 } = await gameService.saveProgressCheckpoint(sessionId, 'C01', 1, 'C01 Baseline');

    await gameService.recordScoreEvent({
      sessionId,
      teamId: 'C02',
      levelId: 1,
      eventType: 'COMPROMISE_SUCCESS',
      scoreDelta: 200,
      idempotencyKey: 'c02-isolated-score'
    });

    // Restore C01
    await gameService.restoreSnapshot({
      sessionId,
      snapshotId: snapC01.id,
      adminIdentity: 'ADMIN',
      reason: 'Restore C01'
    });

    // Verify C02 is completely untouched
    const scoreC02 = await gameService.recalculateTeamScore(sessionId, 'C02');
    assert.equal(scoreC02, 200);
  });

  test('Administrative audit log records restore and reset operations', async () => {
    const sessionId = 'session-rec-audit';
    await gameService.getOrCreateSession(sessionId, 4, 1);
    await gameService.startGame(sessionId);

    const { snapshot } = await gameService.saveProgressCheckpoint(sessionId, 'C03', 1, 'Baseline');

    await gameService.restoreSnapshot({
      sessionId,
      snapshotId: snapshot.id,
      adminIdentity: 'SEC_DIRECTOR',
      reason: 'Emergency forensic remediation'
    });

    const supabase = getServiceClient();
    const { data: auditLogs } = await supabase
      .from('admin_audit_logs')
      .select('*')
      .eq('session_id', sessionId);

    assert.ok(auditLogs.length >= 1);
    const restoreLog = auditLogs.find(l => l.action_type === 'RESTORE_SNAPSHOT');
    assert.ok(restoreLog);
    assert.equal(restoreLog.admin_identity, 'SEC_DIRECTOR');
    assert.equal(restoreLog.reason, 'Emergency forensic remediation');
    assert.equal(restoreLog.target_team_id, 'C03');
  });

  test('Reset team level and reset team entire progress', async () => {
    const sessionId = 'session-rec-resets';
    await gameService.getOrCreateSession(sessionId, 4, 1);
    await gameService.startGame(sessionId);

    await gameService.recordScoreEvent({
      sessionId,
      teamId: 'C01',
      levelId: 1,
      eventType: 'COMPROMISE_SUCCESS',
      scoreDelta: 100,
      idempotencyKey: 'c01-reset-test'
    });

    // Reset Level 1
    const resetLvl = await gameService.resetTeamLevel(sessionId, 'C01', 1, 'ADMIN', 'Resetting level 1');
    assert.equal(resetLvl.status, 'RESET');

    // Reset entire squad
    const resetEntire = await gameService.resetTeamEntireProgress(sessionId, 'C01', 'ADMIN', 'Full wipe');
    assert.equal(resetEntire.success, true);

    const team = await gameService.recalculateTeamScore(sessionId, 'C01');
    assert.equal(team, 0);
  });
});
