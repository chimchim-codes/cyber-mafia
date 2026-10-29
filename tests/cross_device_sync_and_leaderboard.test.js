// tests/cross_device_sync_and_leaderboard.test.js
// Multi-Device Synchronization, Stale-Player Elimination, and Dedicated Full-Screen Live Leaderboard Test Suite

const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert');
const gameService = require('../server/services/gameService');
const { getServiceClient, resetMemoryStore } = require('../server/db/supabaseClient');
const sessionHandler = require('../api/session');
const leaderboardHandler = require('../api/leaderboard');
const gameActionHandler = require('../api/game-action');

const mockReq = ({ method = 'GET', query = {}, body = {}, headers = {} } = {}) => ({
  method,
  query,
  body,
  headers: { ...headers }
});

const mockRes = () => {
  let statusCode = 200;
  let headers = {};
  let body = null;
  const res = {
    statusCode,
    headers,
    body,
    setHeader: (k, v) => { headers[k] = v; },
    status: (code) => {
      res.statusCode = code;
      return res;
    },
    json: (data) => {
      res.body = data;
      return res;
    },
    send: (data) => {
      res.body = data;
      return res;
    },
    end: () => res
  };
  return res;
};

describe('Cross-Device Synchronization, Admin Panel Cleanliness & Full-Screen Leaderboard Suite', () => {
  const sessionId = 'test-sync-session-' + Date.now();
  const adminKey = 'super-secret-admin-pass-1234';

  beforeEach(async () => {
    resetMemoryStore();
    process.env.ADMIN_SECRET_KEY = adminKey;
    await gameService.getOrCreateSession(sessionId);
  });

  test('1 & 2 & 3 & 4. Device B joins with new team name; Device A (Admin) retrieves updated player list and standings without mock data', async () => {
    // Before join: active player list must be completely empty (no bots, no mock names)
    const initialState = await gameService.getClientState(sessionId, null, true);
    assert.equal(initialState.teams.length, 0, 'No active teams should appear before players join');

    // Device B joins
    const joinReq = mockReq({
      method: 'POST',
      body: {
        action: 'JOIN_TEAM',
        sessionId,
        teamId: 'SQ_VIPER',
        playerName: 'Agent Scott',
        teamName: 'Viper Strike Team',
        systemNo: 'PC-SYS-09'
      }
    });
    const joinRes = mockRes();
    await sessionHandler(joinReq, joinRes);
    assert.equal(joinRes.statusCode, 200);
    assert.equal(joinRes.body.team.name, 'Viper Strike Team');

    // Device A (Admin) queries session state via GET /api/session
    const adminReq = mockReq({
      method: 'GET',
      query: { sessionId },
      headers: { 'x-admin-key': adminKey }
    });
    const adminRes = mockRes();
    await sessionHandler(adminReq, adminRes);
    assert.equal(adminRes.statusCode, 200);
    const adminTeams = adminRes.body.teams;
    assert.equal(adminTeams.length, 1);
    assert.equal(adminTeams[0].name, 'Viper Strike Team');
    assert.equal(adminTeams[0].systemNo, 'PC-SYS-09');
    assert.equal(adminTeams[0].id, 'SQ_VIPER');

    // Admin leaderboard also reflects Viper Strike Team
    const lbReq = mockReq({ method: 'GET', query: { sessionId } });
    const lbRes = mockRes();
    await leaderboardHandler(lbReq, lbRes);
    assert.equal(lbRes.statusCode, 200);
    assert.equal(lbRes.body.leaderboard.length, 1);
    assert.equal(lbRes.body.leaderboard[0].teamName, 'Viper Strike Team');
  });

  test('5 & 6. Device C (Full-Screen Leaderboard) receives identical authoritative standings as additional players join', async () => {
    // Join Device B
    await gameService.joinTeam(sessionId, 'Alice', 'SQ_APEX', 'client-b', {
      teamName: 'Apex Predators',
      systemNo: 'ST-01'
    });

    // Join Device D
    await gameService.joinTeam(sessionId, 'Bob', 'SQ_SHIELD', 'client-d', {
      teamName: 'Aegis Shield',
      systemNo: 'ST-02'
    });

    // Award score to Apex Predators
    await gameService.recordScoreEvent({
      sessionId,
      teamId: 'SQ_APEX',
      levelId: 1,
      eventType: 'SOLVE_INVESTIGATION_CTF',
      scoreDelta: 100
    });

    // Device C (Projector) queries /api/leaderboard
    const lbReq = mockReq({ method: 'GET', query: { sessionId } });
    const lbRes = mockRes();
    await leaderboardHandler(lbReq, lbRes);

    assert.equal(lbRes.statusCode, 200);
    const lb = lbRes.body.leaderboard;
    assert.equal(lb.length, 2);
    // Rank 1: Apex Predators (100 PTS)
    assert.equal(lb[0].rank, 1);
    assert.equal(lb[0].teamName, 'Apex Predators');
    assert.equal(lb[0].score, 100);
    // Rank 2: Aegis Shield (0 PTS)
    assert.equal(lb[1].rank, 2);
    assert.equal(lb[1].teamName, 'Aegis Shield');
    assert.equal(lb[1].score, 0);
  });

  test('7 & 8 & 9. Admin removes player; player disappears from all views and cannot reconnect or score', async () => {
    await gameService.joinTeam(sessionId, 'Rogue', 'SQ_ROGUE', 'client-rogue', {
      teamName: 'Rogue Infiltrators',
      systemNo: 'SYS-ROGUE'
    });

    // Verify player is present
    let lb = await gameService.getLeaderboard(sessionId, { activeOnly: true });
    assert.equal(lb.length, 1);

    // Admin removes player via /api/game-action
    const removeReq = mockReq({
      method: 'POST',
      headers: { 'x-admin-key': adminKey },
      body: {
        action: 'ADMIN_REMOVE_PLAYER',
        sessionId,
        teamId: 'SQ_ROGUE',
        payload: { teamId: 'SQ_ROGUE', reason: 'Disqualified for policy violation' }
      }
    });
    const removeRes = mockRes();
    await gameActionHandler(removeReq, removeRes);
    assert.equal(removeRes.statusCode, 200);
    assert.equal(removeRes.body.success, true);

    // 1. Leaderboard must be empty
    lb = await gameService.getLeaderboard(sessionId, { activeOnly: true });
    assert.equal(lb.length, 0);

    // 2. Client session state must NOT include removed player
    const state = await gameService.getClientState(sessionId, null, true);
    assert.equal(state.teams.length, 0);

    // 3. Removed player attempting action is blocked with HTTP 403 REMOVED_BY_ADMIN
    const actionReq = mockReq({
      method: 'POST',
      body: {
        action: 'SOLVE_CIVILIAN_CHALLENGE',
        sessionId,
        teamId: 'SQ_ROGUE',
        payload: { challengeId: 'CHAL-PY-1', code: 'print(header)' }
      }
    });
    const actionRes = mockRes();
    await gameActionHandler(actionReq, actionRes);
    assert.equal(actionRes.statusCode, 403);
    assert.equal(actionRes.body.code, 'REMOVED_BY_ADMIN');

    // 4. Heartbeat from removed player returns removed status
    const hbRes = await gameService.recordHeartbeat(sessionId, 'SQ_ROGUE');
    assert.equal(hbRes.success, false);
    assert.equal(hbRes.status, 'REMOVED_BY_ADMIN');
  });

  test('10 & 11. Disconnect and reconnect does not create duplicate players; restores state cleanly', async () => {
    // Initial join
    const team1 = await gameService.joinTeam(sessionId, 'Sarah Connor', 'SQ_RESIST', 'client-conn-1', {
      teamName: 'Resistance Unit',
      systemNo: 'PC-99'
    });
    assert.equal(team1.players.length, 1);

    // Reconnect same player from same squad
    const reconReq = mockReq({
      method: 'POST',
      body: {
        action: 'RECONNECT',
        sessionId,
        teamId: 'SQ_RESIST',
        playerName: 'Sarah Connor'
      }
    });
    const reconRes = mockRes();
    await sessionHandler(reconReq, reconRes);
    assert.equal(reconRes.statusCode, 200);
    assert.equal(reconRes.body.success, true);

    // Verify team count and player count remain exactly 1 (no duplicates)
    const state = await gameService.getClientState(sessionId, 'SQ_RESIST', false);
    assert.equal(state.teams.length, 1);
    assert.equal(state.teams[0].playersCount, 1);
  });

  test('12. Stale players without heartbeats (>90s) are filtered out of active lists and leaderboards', async () => {
    // Join active squad
    await gameService.joinTeam(sessionId, 'Active User', 'SQ_ACTIVE', 'client-act', {
      teamName: 'Active Sentinels',
      systemNo: 'SYS-ACT'
    });

    // Join stale squad with simulated old timestamp (3 minutes ago)
    await gameService.joinTeam(sessionId, 'Stale User', 'SQ_STALE', 'client-stale', {
      teamName: 'Forgotten Squad',
      systemNo: 'SYS-OLD'
    });

    const supabase = getServiceClient();
    const staleTime = new Date(Date.now() - 180000).toISOString();
    await supabase.from('teams').update({
      last_seen_at: staleTime
    }).eq('session_id', sessionId).eq('id', 'SQ_STALE');

    // Leaderboard must only contain the active player
    const lb = await gameService.getLeaderboard(sessionId, { activeOnly: true, timeoutMs: 90000 });
    assert.equal(lb.length, 1);
    assert.equal(lb[0].teamName, 'Active Sentinels');

    // Admin state must also filter out the stale squad
    const state = await gameService.getClientState(sessionId, null, true);
    assert.equal(state.teams.length, 1);
    assert.equal(state.teams[0].name, 'Active Sentinels');
  });

  test('13 & 14. Regular players cannot perform admin actions; unauthorized mutations are strictly rejected', async () => {
    // Regular player attempts START_GAME without admin key
    const startReq = mockReq({
      method: 'POST',
      body: { action: 'START_GAME', sessionId }
    });
    const startRes = mockRes();
    await gameActionHandler(startReq, startRes);
    assert.equal(startRes.statusCode, 401);

    // Regular player attempts ADMIN_RESET_GAME with wrong key
    const resetReq = mockReq({
      method: 'POST',
      headers: { 'x-admin-key': 'incorrect-guess' },
      body: { action: 'ADMIN_RESET_GAME', sessionId }
    });
    const resetRes = mockRes();
    await gameActionHandler(resetReq, resetRes);
    assert.equal(resetRes.statusCode, 403);
  });

  test('15. Admin Reset wipes dynamic squads and erases scores for a clean new game', async () => {
    await gameService.joinTeam(sessionId, 'Player A', 'SQ_TEAM_A', 'c-a', { teamName: 'Alpha Squad' });
    await gameService.recordScoreEvent({
      sessionId,
      teamId: 'SQ_TEAM_A',
      levelId: 1,
      eventType: 'SOLVE_INVESTIGATION_CTF',
      scoreDelta: 75
    });

    // Admin resets game
    const resetReq = mockReq({
      method: 'POST',
      headers: { 'x-admin-key': adminKey },
      body: { action: 'ADMIN_RESET_GAME', sessionId }
    });
    const resetRes = mockRes();
    await gameActionHandler(resetReq, resetRes);
    assert.equal(resetRes.statusCode, 200);

    // Standings and active teams should now be completely clean
    const lb = await gameService.getLeaderboard(sessionId, { activeOnly: true });
    assert.equal(lb.length, 0);

    const state = await gameService.getClientState(sessionId, null, true);
    assert.equal(state.teams.length, 0);
    assert.equal(state.status, 'NOT_STARTED');
    assert.equal(state.phase, 'LOBBY');
  });
});
