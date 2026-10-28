// tests/player_identity_and_admin_removal.test.js
// Verification suite for Player Identity, Live Leaderboard (real active players only),
// and Admin-Only Player Removal

const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const gameService = require('../server/services/gameService');
const { resetMemoryStore, getServiceClient } = require('../server/db/supabaseClient');
const gameActionHandler = require('../api/game-action');
const leaderboardHandler = require('../api/leaderboard');
const sessionHandler = require('../api/session');

function mockReq(options = {}) {
  return {
    method: options.method || 'POST',
    headers: options.headers || {},
    query: options.query || {},
    body: options.body || {}
  };
}

function mockRes() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(key, val) {
      this.headers[key] = val;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
    send(data) {
      this.body = data;
      return this;
    },
    end() {
      return this;
    }
  };
}

describe('Player Identity, Live Leaderboard & Admin Removal Suite', () => {
  beforeEach(() => {
    resetMemoryStore();
    process.env.ADMIN_SECRET_KEY = 'secret-admin-key-test';
  });

  test('1. Uses exact team name entered by player without random codenames', async () => {
    const sessionId = 'session-identity-1';
    await gameService.getOrCreateSession(sessionId);

    // Player joins with custom squad name "Sentinels of Valor"
    const squadName = '  Sentinels of Valor  ';
    const systemNo = 'SYS-42';
    const teamId = 'SQ_VALOR';

    const team = await gameService.joinTeam(sessionId, 'Alex Mercer', teamId, 'client-1', {
      teamName: squadName,
      systemNo
    });

    assert.equal(team.name, 'Sentinels of Valor');
    assert.equal(team.system_no, 'SYS-42');
    assert.equal(team.is_bot, false);
    assert.equal(team.is_active, true);

    // Verify database reflects the exact trimmed team name
    const supabase = getServiceClient();
    const { data: dbTeam } = await supabase.from('teams').select('*').eq('session_id', sessionId).eq('id', teamId).single();
    assert.equal(dbTeam.name, 'Sentinels of Valor');
    assert.equal(dbTeam.system_no, 'SYS-42');
  });

  test('2. Live active leaderboard displays only real, active players (no bots or mock data)', async () => {
    const sessionId = 'session-lb-active-only';
    // Initialize session which initializes 8 default bot teams
    await gameService.getOrCreateSession(sessionId, 8, 2);

    // Before any real player joins, activeOnly leaderboard MUST be empty
    const emptyLb = await gameService.getLeaderboard(sessionId, { activeOnly: true });
    assert.equal(emptyLb.length, 0);

    // Endpoint /api/leaderboard must also return empty array by default
    const req1 = mockReq({ method: 'GET', query: { sessionId } });
    const res1 = mockRes();
    await leaderboardHandler(req1, res1);
    assert.equal(res1.statusCode, 200);
    assert.deepEqual(res1.body.leaderboard, []);

    // Now, two real players join with their respective squad names
    await gameService.joinTeam(sessionId, 'Alice', 'SQ_PHANTOM', 'client-alice', {
      teamName: 'Phantom Hackers',
      systemNo: 'PC-01'
    });
    await gameService.joinTeam(sessionId, 'Bob', 'SQ_AEGIS', 'client-bob', {
      teamName: 'Aegis Defense',
      systemNo: 'PC-02'
    });

    // Award points to Phantom Hackers
    await gameService.recordScoreEvent({
      sessionId,
      teamId: 'SQ_PHANTOM',
      levelId: 1,
      eventType: 'SOLVE_INVESTIGATION_CTF',
      scoreDelta: 75,
      idempotencyKey: 'score-phantom-1'
    });

    const activeLb = await gameService.getLeaderboard(sessionId, { activeOnly: true });
    assert.equal(activeLb.length, 2);
    assert.equal(activeLb[0].teamName, 'Phantom Hackers');
    assert.equal(activeLb[0].score, 75);
    assert.equal(activeLb[0].systemNo, 'PC-01');
    assert.equal(activeLb[1].teamName, 'Aegis Defense');
    assert.equal(activeLb[1].score, 0);
    assert.equal(activeLb[1].systemNo, 'PC-02');
  });

  test('3. Heartbeat tracks last_seen_at and filters out stale disconnected players', async () => {
    const sessionId = 'session-heartbeat-timeout';
    await gameService.getOrCreateSession(sessionId);

    await gameService.joinTeam(sessionId, 'Charlie', 'SQ_STALE', 'client-charlie', {
      teamName: 'Stale Investigators',
      systemNo: 'SYS-99'
    });

    // Manually backdate last_seen_at to 120 seconds ago
    const supabase = getServiceClient();
    const staleTime = new Date(Date.now() - 120000).toISOString();
    await supabase.from('teams').update({ last_seen_at: staleTime }).eq('session_id', sessionId).eq('id', 'SQ_STALE');

    // With a 60s timeout, the stale team should be excluded from active leaderboard
    const staleLb = await gameService.getLeaderboard(sessionId, { activeOnly: true, timeoutMs: 60000 });
    assert.equal(staleLb.length, 0);

    // Heartbeat brings them back to active status
    const hbRes = await gameService.recordHeartbeat(sessionId, 'SQ_STALE');
    assert.equal(hbRes.success, true);
    assert.equal(hbRes.status, 'ACTIVE');

    const freshLb = await gameService.getLeaderboard(sessionId, { activeOnly: true, timeoutMs: 60000 });
    assert.equal(freshLb.length, 1);
    assert.equal(freshLb[0].teamId, 'SQ_STALE');
  });

  test('4. Admin removal strictly requires admin authorization', async () => {
    const sessionId = 'session-removal-auth';
    await gameService.getOrCreateSession(sessionId);
    await gameService.joinTeam(sessionId, 'Rogue', 'SQ_ROGUE', 'client-rogue', {
      teamName: 'Rogue Squad'
    });

    // Unauthenticated attempt should fail
    const unauthReq = mockReq({
      method: 'POST',
      body: {
        action: 'ADMIN_REMOVE_PLAYER',
        sessionId,
        teamId: 'SQ_ROGUE'
      }
    });
    const unauthRes = mockRes();
    await gameActionHandler(unauthReq, unauthRes);
    assert.equal(unauthRes.statusCode, 401);

    // Invalid admin key attempt should fail
    const badKeyReq = mockReq({
      method: 'POST',
      headers: { 'x-admin-key': 'wrong-key' },
      body: {
        action: 'ADMIN_REMOVE_PLAYER',
        sessionId,
        teamId: 'SQ_ROGUE'
      }
    });
    const badKeyRes = mockRes();
    await gameActionHandler(badKeyReq, badKeyRes);
    assert.equal(badKeyRes.statusCode, 403);
  });

  test('5. Authenticated admin removes player, dropping them from leaderboard and blocking reconnect/scoring', async () => {
    const sessionId = 'session-removal-flow';
    await gameService.getOrCreateSession(sessionId);

    await gameService.joinTeam(sessionId, 'Target', 'SQ_TARGET', 'client-target', {
      teamName: 'Target Squad',
      systemNo: 'SYS-11'
    });
    await gameService.joinTeam(sessionId, 'Clean', 'SQ_CLEAN', 'client-clean', {
      teamName: 'Clean Squad',
      systemNo: 'SYS-22'
    });

    // Confirm both are active initially
    let lb = await gameService.getLeaderboard(sessionId, { activeOnly: true });
    assert.equal(lb.length, 2);

    // Admin executes removal
    const adminReq = mockReq({
      method: 'POST',
      headers: { 'x-admin-key': 'secret-admin-key-test' },
      body: {
        action: 'ADMIN_REMOVE_PLAYER',
        sessionId,
        teamId: 'SQ_TARGET',
        payload: {
          teamId: 'SQ_TARGET',
          reason: 'Proctoring violation: Multiple screen disconnects'
        }
      }
    });
    const adminRes = mockRes();
    await gameActionHandler(adminReq, adminRes);
    assert.equal(adminRes.statusCode, 200);
    assert.equal(adminRes.body.success, true);

    // Active leaderboard must now only contain Clean Squad
    lb = await gameService.getLeaderboard(sessionId, { activeOnly: true });
    assert.equal(lb.length, 1);
    assert.equal(lb[0].teamId, 'SQ_CLEAN');

    // Heartbeat from removed squad returns removal status
    const hbRes = await gameService.recordHeartbeat(sessionId, 'SQ_TARGET');
    assert.equal(hbRes.success, false);
    assert.equal(hbRes.removed, true);
    assert.equal(hbRes.status, 'REMOVED_BY_ADMIN');

    // Reconnection attempt from removed squad throws error
    await assert.rejects(
      async () => {
        await gameService.reconnectTeam(sessionId, 'SQ_TARGET');
      },
      /removed by the administrator/
    );

    // Scoring attempt by removed squad throws error
    await assert.rejects(
      async () => {
        await gameService.recordScoreEvent({
          sessionId,
          teamId: 'SQ_TARGET',
          levelId: 1,
          eventType: 'COMPROMISE_SUCCESS',
          scoreDelta: 100
        });
      },
      /removed by the administrator/
    );

    // Game action handler blocks regular actions from removed team with 403
    const actionReq = mockReq({
      method: 'POST',
      body: {
        action: 'SUBMIT_PYTHON_STAGE',
        sessionId,
        teamId: 'SQ_TARGET',
        payload: { stage: 1, code: 'print(1)' }
      }
    });
    const actionRes = mockRes();
    await gameActionHandler(actionReq, actionRes);
    assert.equal(actionRes.statusCode, 403);
    assert.equal(actionRes.body.code, 'REMOVED_BY_ADMIN');
  });
});
