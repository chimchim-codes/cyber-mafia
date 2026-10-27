// tests/supabase_integration.test.js
// Dedicated Live Supabase Integration Test Suite
// Verifies real PostgreSQL connectivity, session persistence, idempotency, timing, snapshots, and isolation.
// Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in environment or .env.

require('dotenv').config();
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createClient } = require('@supabase/supabase-js');
const gameService = require('../server/services/gameService');

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const isSupabaseConfigured = Boolean(supabaseUrl && supabaseServiceKey && !process.env.CYBER_MAFIA_USE_MOCK_DB);

describe('Live Supabase PostgreSQL Integration Suite', () => {
  if (!isSupabaseConfigured) {
    test('Notice: Live Supabase Integration Tests Skipped', () => {
      console.log('-----------------------------------------------------------------');
      console.log('ℹ️  SUPABASE INTEGRATION TESTS SKIPPED:');
      console.log('   SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are not configured.');
      console.log('   To test against your live Supabase project:');
      console.log('   1. Add your credentials to .env (do not commit .env)');
      console.log('   2. Apply the schema migration: supabase/migrations/001_initial_schema.sql');
      console.log('   3. Run: npm run test:integration');
      console.log('-----------------------------------------------------------------');
      assert.ok(true);
    });
    return;
  }

  const liveClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false }
  });

  const testSessionA = `test-intg-A-${Date.now()}`;
  const testSessionB = `test-intg-B-${Date.now()}`;

  // Cleanup test sessions after suite finishes
  after(async () => {
    try {
      await liveClient.from('game_sessions').delete().in('id', [testSessionA, testSessionB]);
    } catch (err) {
      console.warn('Test cleanup warning:', err.message);
    }
  });

  test('1. Database Connectivity: Can query Supabase tables and verify schema', async () => {
    const { data, error } = await liveClient.from('game_sessions').select('id').limit(1);
    assert.equal(error, null, `Supabase connection failed: ${error?.message}`);
    assert.ok(Array.isArray(data), 'Expected array response from game_sessions');
  });

  test('2. Session Creation & Persistence: Session and default squads persist in PostgreSQL', async () => {
    const session = await gameService.getOrCreateSession(testSessionA, 4, 1);
    assert.equal(session.id, testSessionA);
    assert.equal(session.status, 'NOT_STARTED');

    // Direct database verification
    const { data: dbSession, error: sessErr } = await liveClient
      .from('game_sessions')
      .select('*')
      .eq('id', testSessionA)
      .single();

    assert.equal(sessErr, null);
    assert.equal(dbSession.id, testSessionA);

    const { data: dbTeams, error: teamErr } = await liveClient
      .from('teams')
      .select('*')
      .eq('session_id', testSessionA);

    assert.equal(teamErr, null);
    assert.equal(dbTeams.length, 4, 'Expected 4 initial squads in PostgreSQL');
  });

  test('3. Team Joining: Player roster update persists in database', async () => {
    const updatedTeam = await gameService.joinTeam(testSessionA, 'IntegrationAgent', 'C01', 'CLI_INTG_1');
    assert.equal(updatedTeam.id, 'C01');
    assert.equal(updatedTeam.is_bot, false);

    const { data: dbTeam } = await liveClient
      .from('teams')
      .select('*')
      .eq('session_id', testSessionA)
      .eq('id', 'C01')
      .single();

    assert.equal(dbTeam.is_bot, false);
    assert.ok(Array.isArray(dbTeam.players));
    assert.ok(dbTeam.players.some(p => p.name === 'IntegrationAgent'));
  });

  test('4. Score Persistence & Database-Level Idempotency', async () => {
    const idempotencyKey = `intg-score-${Date.now()}`;

    // First award
    const res1 = await gameService.recordScoreEvent({
      sessionId: testSessionA,
      teamId: 'C01',
      levelId: 1,
      eventType: 'SOLVE_INVESTIGATION_CTF',
      scoreDelta: 75,
      idempotencyKey
    });

    assert.equal(res1.success, true);
    assert.equal(res1.newScore, 75);

    // Duplicate submission with same idempotency key must be safely rejected
    const res2 = await gameService.recordScoreEvent({
      sessionId: testSessionA,
      teamId: 'C01',
      levelId: 1,
      eventType: 'SOLVE_INVESTIGATION_CTF',
      scoreDelta: 75,
      idempotencyKey
    });

    assert.equal(res2.success, false);
    assert.equal(res2.duplicate, true);

    // Verify team score was NOT double awarded
    const { data: dbTeam } = await liveClient
      .from('teams')
      .select('score')
      .eq('session_id', testSessionA)
      .eq('id', 'C01')
      .single();

    assert.equal(dbTeam.score, 75, 'Score must remain 75 (idempotent)');
  });

  test('5. Lifecycle Timing & Pause/Resume state in PostgreSQL', async () => {
    // Start Game
    const startRes = await gameService.startGame(testSessionA);
    assert.equal(startRes.success, true);

    // Pause Game
    const pauseRes = await gameService.pauseGame(testSessionA, 'TEST_ADMIN');
    assert.equal(pauseRes.success, true);
    assert.equal(pauseRes.session.status, 'PAUSED');

    // Duplicate pause must be idempotent
    const pauseDup = await gameService.pauseGame(testSessionA, 'TEST_ADMIN');
    assert.equal(pauseDup.success, true);

    // Resume Game
    const resumeRes = await gameService.resumeGame(testSessionA, 'TEST_ADMIN');
    assert.equal(resumeRes.success, true);
    assert.equal(resumeRes.session.status, 'RUNNING');
  });

  test('6. Recovery Snapshot Creation, History & Atomic Restoration', async () => {
    // Save checkpoint
    const { snapshot } = await gameService.saveProgressCheckpoint(
      testSessionA, 'C01', 1, 'Manual Integration Test Checkpoint'
    );
    assert.ok(snapshot.id);

    // Retrieve snapshot from database
    const history = await gameService.getSnapshotHistory(testSessionA, 'C01', 1);
    assert.ok(history.length >= 1);
    assert.ok(history.some(s => s.id === snapshot.id));

    // Restore snapshot
    const restoreRes = await gameService.restoreSnapshot({
      sessionId: testSessionA,
      snapshotId: snapshot.id,
      adminIdentity: 'TEST_ADMIN',
      reason: 'Integration test rollback verification'
    });

    assert.equal(restoreRes.success, true);
    assert.ok(restoreRes.restoredProgress);
  });

  test('7. CSV Export Generation against PostgreSQL Live Data', async () => {
    const csvData = await gameService.generateFinalResultsCsv(testSessionA);
    assert.ok(csvData.csvContent.includes('Rank,Team ID,Team Name,Final Score'));
    assert.ok(csvData.csvContent.includes('C01'));
    assert.equal(csvData.totalTeams, 4);
  });

  test('8. Session Isolation: Session B data does not mutate Session A', async () => {
    // Create second independent session
    await gameService.getOrCreateSession(testSessionB, 4, 1);

    // Score in Session B
    await gameService.recordScoreEvent({
      sessionId: testSessionB,
      teamId: 'C01',
      levelId: 1,
      eventType: 'COMPROMISE_SUCCESS',
      scoreDelta: 100,
      idempotencyKey: `intg-iso-${Date.now()}`
    });

    const lbA = await gameService.getLeaderboard(testSessionA);
    const lbB = await gameService.getLeaderboard(testSessionB);

    const teamAC01 = lbA.find(t => t.teamId === 'C01');
    const teamBC01 = lbB.find(t => t.teamId === 'C01');

    assert.notEqual(teamAC01.score, teamBC01.score, 'Scores across isolated sessions must not collide');
  });
});
