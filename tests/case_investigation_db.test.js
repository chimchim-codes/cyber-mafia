// tests/case_investigation_db.test.js
// Tests for False Trials case investigation database integration:
// - Suspect auto-provisioning & joining
// - Security Alert anti-cheat logging
// - Python challenge solving with accepted alternatives
// - MCQ high tribunal conviction & acquittal scoring

const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const gameService = require('../server/services/gameService');
const gameActionHandler = require('../api/game-action');
const { resetMemoryStore, getServiceClient } = require('../server/db/supabaseClient');

describe('Database Integration: False Trials Murder Investigation', () => {
  const sessionId = 'test-case-session';

  beforeEach(() => {
    resetMemoryStore();
    process.env.CYBER_MAFIA_USE_MOCK_DB = 'true';
    process.env.ADMIN_SECRET_KEY = 'test-secret';
  });

  test('Auto-provisions suspect (S01 - Dr. Mira Sen) when joined', async () => {
    const team = await gameService.joinTeam(sessionId, 'Investigator_1', 'S01');
    assert.equal(team.id, 'S01');
    assert.equal(team.name, 'Dr. Mira Sen');
    assert.equal(team.is_bot, false);

    const supabase = getServiceClient();
    const { data: dbTeam } = await supabase.from('teams').select('*').eq('session_id', sessionId).eq('id', 'S01').single();
    assert.ok(dbTeam);
    assert.equal(dbTeam.name, 'Dr. Mira Sen');
    assert.equal(dbTeam.role, 'CIVILIAN');
  });

  test('api/game-action handles SECURITY_ALERT anti-cheat logging', async () => {
    let responseStatus = null;
    let responseBody = null;

    const req = {
      method: 'POST',
      headers: {},
      body: {
        action: 'SECURITY_ALERT',
        sessionId,
        teamId: 'S01',
        payload: {
          type: 'FULLSCREEN_EXIT',
          details: 'User exited fullscreen mode',
          stage: 2
        }
      }
    };
    const res = {
      setHeader: () => {},
      status: (code) => {
        responseStatus = code;
        return {
          json: (data) => { responseBody = data; return res; },
          end: () => res
        };
      }
    };

    await gameActionHandler(req, res);
    assert.equal(responseStatus, 200);
    assert.equal(responseBody.success, true);

    const supabase = getServiceClient();
    const { data: logs } = await supabase.from('game_logs').select('*').eq('session_id', sessionId);
    assert.ok(logs.some(l => l.log_type === 'SECURITY_ALERT' && l.message.includes('FULLSCREEN_EXIT')));
  });

  test('api/game-action accepts alternative solutions for Python challenge', async () => {
    let responseStatus = null;
    let responseBody = null;

    // Challenge 1 alternative: 'BYPASS-ELENA-WARD'
    const req = {
      method: 'POST',
      headers: {},
      body: {
        action: 'SOLVE_CIVILIAN_CHALLENGE',
        sessionId,
        teamId: 'S01',
        payload: {
          challengeId: 'CHAL-PY-1',
          answer: 'BYPASS-ELENA-WARD',
          stageNumber: 1
        }
      }
    };
    const res = {
      setHeader: () => {},
      status: (code) => {
        responseStatus = code;
        return {
          json: (data) => { responseBody = data; return res; },
          end: () => res
        };
      }
    };

    await gameActionHandler(req, res);
    assert.equal(responseStatus, 200);
    assert.equal(responseBody.success, true);
    assert.match(responseBody.message, /Challenge Solved/i);
  });

  test('api/game-action evaluates SUBMIT_MCQ_ACCUSATION and convicts Elena Ward on 5/5', async () => {
    let responseStatus = null;
    let responseBody = null;

    const req = {
      method: 'POST',
      headers: {},
      body: {
        action: 'SUBMIT_MCQ_ACCUSATION',
        sessionId,
        teamId: 'S01',
        payload: {
          answers: {
            q1: 'D',
            q2: 'A',
            q3: 'B',
            q4: 'D',
            q5: ['A', 'B', 'C', 'D']
          }
        }
      }
    };
    const res = {
      setHeader: () => {},
      status: (code) => {
        responseStatus = code;
        return {
          json: (data) => { responseBody = data; return res; },
          end: () => res
        };
      }
    };

    await gameActionHandler(req, res);
    assert.equal(responseStatus, 200);
    assert.equal(responseBody.isSolved, true);
    assert.equal(responseBody.score, 5);

    const supabase = getServiceClient();
    const { data: session } = await supabase.from('game_sessions').select('*').eq('id', sessionId).single();
    assert.equal(session.status, 'COMPLETED');
    assert.equal(session.reveal_result.killerName, 'Elena Ward');
  });

  test('api/game-action assesses penalty for incorrect MCQ accusation', async () => {
    let responseStatus = null;
    let responseBody = null;

    const req = {
      method: 'POST',
      headers: {},
      body: {
        action: 'SUBMIT_MCQ_ACCUSATION',
        sessionId,
        teamId: 'S01',
        payload: {
          answers: {
            q1: 'A', // Wrong suspect
            q2: 'A',
            q3: 'B',
            q4: 'D',
            q5: ['A']
          }
        }
      }
    };
    const res = {
      setHeader: () => {},
      status: (code) => {
        responseStatus = code;
        return {
          json: (data) => { responseBody = data; return res; },
          end: () => res
        };
      }
    };

    await gameActionHandler(req, res);
    assert.equal(responseStatus, 200);
    assert.equal(responseBody.isSolved, false);
    assert.ok(responseBody.score < 5);
  });
});
