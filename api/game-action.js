// api/game-action.js
// Vercel Serverless Endpoint for Authoritative Game Operations

const gameService = require('../server/services/gameService');
const { getServiceClient } = require('../server/db/supabaseClient');
const { generateHackerChallenge, generateCivilianLabChallenges } = require('../server/game/challenges');
const { verifyAdminAuthorization } = require('../server/utils/auth');

const labChallenges = generateCivilianLabChallenges();

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-key, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  const { action, sessionId = 'default-cyber-session', teamId, payload = {} } = req.body || {};
  const supabase = getServiceClient();

  try {
    const session = await gameService.getOrCreateSession(sessionId);

    // Lifecycle Actions (All administrative lifecycle actions require verified admin authorization)
    if (action === 'START_GAME') {
      const auth = verifyAdminAuthorization(req);
      if (!auth.authorized) {
        return res.status(auth.statusCode || 401).json({
          success: false,
          code: auth.code,
          message: auth.message || 'Admin authorization required to start match.'
        });
      }
      const result = await gameService.startGame(sessionId);
      return res.status(200).json(result);
    }

    if (action === 'PAUSE_GAME') {
      const auth = verifyAdminAuthorization(req);
      if (!auth.authorized) {
        return res.status(auth.statusCode || 401).json({
          success: false,
          code: auth.code,
          message: auth.message || 'Admin authorization required to pause match.'
        });
      }
      const result = await gameService.pauseGame(sessionId, 'ADMIN');
      return res.status(200).json(result);
    }

    if (action === 'RESUME_GAME') {
      const auth = verifyAdminAuthorization(req);
      if (!auth.authorized) {
        return res.status(auth.statusCode || 401).json({
          success: false,
          code: auth.code,
          message: auth.message || 'Admin authorization required to resume match.'
        });
      }
      const result = await gameService.resumeGame(sessionId, 'ADMIN');
      return res.status(200).json(result);
    }

    if (action === 'END_GAME') {
      const auth = verifyAdminAuthorization(req);
      if (!auth.authorized) {
        return res.status(auth.statusCode || 401).json({
          success: false,
          code: auth.code,
          message: auth.message || 'Admin authorization required to end match.'
        });
      }
      const result = await gameService.endGame(sessionId, 'ADMIN', payload.reason || 'Admin ended match.');
      return res.status(200).json(result);
    }

    // Admin Phase & Test Overrides
    if (action === 'FORCE_PHASE') {
      const auth = verifyAdminAuthorization(req);
      if (!auth.authorized) {
        return res.status(auth.statusCode || 401).json({ success: false, code: auth.code, message: auth.message });
      }
      const targetPhase = payload.phase;
      if (targetPhase) {
        await supabase.from('game_sessions').update({
          current_phase: targetPhase,
          phase_timer_seconds: session.phase_duration_seconds || 60,
          phase_started_at: new Date().toISOString()
        }).eq('id', sessionId);
        await gameService.logSystem(sessionId, 'ADMIN_OVERRIDE', 'ADMIN', `Phase manually forced to ${targetPhase}`);
        return res.status(200).json({ success: true, message: `Phase forced to ${targetPhase}` });
      }
    }

    if (action === 'REVEAL_ALL') {
      const auth = verifyAdminAuthorization(req);
      if (!auth.authorized) {
        return res.status(auth.statusCode || 401).json({ success: false, code: auth.code, message: auth.message });
      }
      const { data: teams } = await supabase.from('teams').select('*').eq('session_id', sessionId);
      for (const t of (teams || [])) {
        await supabase.from('teams').update({ secret_revealed: true }).eq('session_id', sessionId).eq('id', t.id);
      }
      await gameService.logSystem(sessionId, 'ADMIN_OVERRIDE', 'ADMIN', 'All squad identities revealed by administrator.');
      return res.status(200).json({ success: true, message: 'All squad roles revealed.' });
    }

    if (action === 'INJECT_ATTACK') {
      const auth = verifyAdminAuthorization(req);
      if (!auth.authorized) {
        return res.status(auth.statusCode || 401).json({ success: false, code: auth.code, message: auth.message });
      }
      const { targetTeamId } = payload;
      if (targetTeamId) {
        const { data: target } = await supabase.from('teams').select('*').eq('session_id', sessionId).eq('id', targetTeamId).single();
        if (target) {
          const newIntegrity = Math.max(0, target.integrity - 20);
          await supabase.from('teams').update({
            integrity: newIntegrity,
            modules: { ...target.modules, evidenceVault: 'DISABLED' }
          }).eq('session_id', sessionId).eq('id', targetTeamId);
          await gameService.logSystem(sessionId, 'ADMIN_INJECT', 'OVERRIDE', `Simulated breach injected into ${targetTeamId}`);
          return res.status(200).json({ success: true, message: `Breach event injected into ${targetTeamId}` });
        }
      }
    }

    if (action === 'ADMIN_RESET_GAME') {
      const auth = verifyAdminAuthorization(req);
      if (!auth.authorized) {
        return res.status(auth.statusCode || 401).json({ success: false, code: auth.code, message: auth.message });
      }

      await supabase.from('game_sessions').update({
        status: 'NOT_STARTED',
        current_phase: 'LOBBY',
        current_round: 1,
        started_at: null,
        ended_at: null,
        is_paused: false,
        pause_started_at: null,
        accumulated_paused_seconds: 0,
        active_accusation: null,
        defense_statement: null,
        jury_votes: {},
        reveal_result: null,
        last_meaningful_update: new Date().toISOString()
      }).eq('id', sessionId);

      // Reset all teams in this session
      const { data: teams } = await supabase.from('teams').select('*').eq('session_id', sessionId);
      for (const t of (teams || [])) {
        await supabase.from('teams').update({
          score: 0,
          integrity: 100,
          is_eliminated: false,
          secret_revealed: false,
          players: [],
          is_bot: true,
          updated_at: new Date().toISOString()
        }).eq('session_id', sessionId).eq('id', t.id);
      }

      // Clear score_events and team_progress for clean slate
      try {
        await supabase.from('score_events').delete().eq('session_id', sessionId);
        await supabase.from('team_progress').delete().eq('session_id', sessionId);
      } catch (_) {}

      await gameService.logSystem(sessionId, 'ADMIN_RESET', 'ADMIN', `Match session ${sessionId} completely reset to Lobby. All scores and checkpoints wiped.`);
      return res.status(200).json({ success: true, message: 'Game session and all scores reset to lobby.' });
    }

    // Proctoring & Audit Actions
    if (action === 'SECURITY_ALERT') {
      const { type, details, playerName, systemNo, teamId: alertTeamId, teamName } = payload || {};
      const formattedMsg = `[PROCTORING BREACH] ${type} by ${playerName || 'Unknown'} (System: ${systemNo || 'N/A'}, Squad: ${teamName || alertTeamId || 'N/A'}): ${details}`;
      await gameService.logSystem(sessionId, 'SECURITY_ALERT', alertTeamId || 'SECURITY', formattedMsg);
      return res.status(200).json({ success: true, message: 'Security alert logged.' });
    }

    if (action === 'PLAYER_LOGIN') {
      const { playerName, systemNo, teamId: loginTeamId, teamName } = payload || {};
      const formattedMsg = `[LOGIN] Investigator ${playerName || 'Agent'} joined squad ${teamName || loginTeamId} from System Terminal: ${systemNo || 'SYS-DEFAULT'}`;
      await gameService.logSystem(sessionId, 'PLAYER_LOGIN', loginTeamId || 'SYSTEM', formattedMsg);
      return res.status(200).json({ success: true, message: 'Login event logged.' });
    }

    if (action === 'GET_AUDIT_TRAIL') {
      const { data: logs } = await supabase
        .from('game_logs')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false });
      return res.status(200).json({ success: true, logs: logs || [] });
    }

    // Verify session is active for regular gameplay actions
    if (session.is_paused || session.status === 'PAUSED') {
      return res.status(400).json({ success: false, message: 'Match is currently PAUSED. Actions are frozen.' });
    }
    if (session.status === 'COMPLETED') {
      return res.status(400).json({ success: false, message: 'Match is COMPLETED. No further actions permitted.' });
    }

    // Gameplay: Request Hacker Attack Challenge
    if (action === 'REQUEST_ATTACK_CHALLENGE') {
      const { targetTeamId, attackType } = payload;
      const { data: attacker } = await supabase.from('teams').select('*').eq('session_id', sessionId).eq('id', teamId).single();
      const { data: target } = await supabase.from('teams').select('*').eq('session_id', sessionId).eq('id', targetTeamId).single();

      if (!attacker || attacker.role !== 'HACKER') {
        return res.status(403).json({ success: false, message: 'Only Hackers can request attack payloads.' });
      }

      const challenge = generateHackerChallenge(attackType, target || { id: targetTeamId }, attacker);
      return res.status(200).json({ success: true, challenge });
    }

    // Gameplay: Hacker Attack Challenge Submission
    if (action === 'SUBMIT_ATTACK_SOLUTION') {
      const { challenge, solution, targetTeamId } = payload;
      if (!challenge || !teamId) {
        return res.status(400).json({ success: false, message: 'Missing challenge or teamId' });
      }

      // Verify attacker role
      const { data: attacker } = await supabase.from('teams').select('*').eq('session_id', sessionId).eq('id', teamId).single();
      if (!attacker || attacker.role !== 'HACKER') {
        return res.status(403).json({ success: false, message: 'Unauthorized: Only Hackers may launch attacks.' });
      }

      const isCorrect = (solution || '').trim().toLowerCase() === (challenge.expectedSolution || '').trim().toLowerCase();

      if (!isCorrect) {
        await gameService.recordScoreEvent({
          sessionId,
          teamId,
          levelId: session.current_round || 1,
          eventType: 'FAILED_ATTACK_PENALTY',
          scoreDelta: session.scoring_rules.FAILED_ATTACK_PENALTY || -25,
          metadata: { challengeId: challenge.id, targetTeamId }
        });
        await gameService.logSystem(sessionId, 'ATTACK_FAIL', `NODE-${teamId}`, `Infiltration failed against ${targetTeamId}`);
        return res.status(200).json({ success: false, message: 'Attack payload rejected. Trace alert triggered!' });
      }

      // Successful Compromise
      await gameService.recordScoreEvent({
        sessionId,
        teamId,
        levelId: session.current_round || 1,
        eventType: 'COMPROMISE_SUCCESS',
        scoreDelta: session.scoring_rules.COMPROMISE_SUCCESS || 100,
        metadata: { challengeId: challenge.id, targetTeamId, attackType: challenge.type }
      });

      // Damage Target
      const { data: target } = await supabase.from('teams').select('*').eq('session_id', sessionId).eq('id', targetTeamId).single();
      if (target) {
        const newIntegrity = Math.max(0, target.integrity - 20);
        const modules = { ...target.modules, evidenceVault: 'DISABLED' };
        await supabase.from('teams').update({
          integrity: newIntegrity,
          modules,
          is_eliminated: newIntegrity <= 0
        }).eq('session_id', sessionId).eq('id', targetTeamId);
      }

      await gameService.logSystem(sessionId, 'BREACH', `NODE-${teamId}`, `${targetTeamId} compromised by infiltration!`);

      return res.status(200).json({
        success: true,
        message: `Target ${targetTeamId} compromised! Integrity reduced. +100 PTS awarded.`,
        damage: 20
      });
    }

    // Gameplay: Civilian CTF Lab Solution
    if (action === 'SOLVE_CIVILIAN_CHALLENGE') {
      const { challengeId, answer } = payload;
      const chal = labChallenges.find(c => c.id === challengeId);
      if (!chal) {
        return res.status(400).json({ success: false, message: 'Challenge not found' });
      }

      const isCorrect = (answer || '').trim().toLowerCase() === (chal.expected || '').trim().toLowerCase();
      if (!isCorrect) {
        return res.status(200).json({ success: false, message: 'Incorrect solution. Inspect the clue and try again.' });
      }

      const scoreResult = await gameService.recordScoreEvent({
        sessionId,
        teamId,
        levelId: session.current_round || 1,
        eventType: 'SOLVE_INVESTIGATION_CTF',
        scoreDelta: chal.rewardScore || 75,
        idempotencyKey: `ctf_${sessionId}_${teamId}_${challengeId}`,
        metadata: { challengeId, category: chal.category }
      });

      if (scoreResult.duplicate) {
        return res.status(200).json({ success: false, message: 'Challenge already solved by your squad.' });
      }

      await gameService.logSystem(sessionId, 'FORENSIC_SOLVE', teamId, `CTF Lab [${chal.title}] solved! Intelligence unlocked.`);

      return res.status(200).json({
        success: true,
        message: `Challenge Solved! +${chal.rewardScore} Points. Forensic Clue: "${chal.evidenceClue}"`,
        clue: chal.evidenceClue
      });
    }

    // Gameplay: Submit MCQ Accusation
    if (action === 'SUBMIT_MCQ_ACCUSATION') {
      const { answers } = payload || {};
      const isQ1 = answers?.q1 === 'D';
      const isQ2 = answers?.q2 === 'A';
      const isQ3 = answers?.q3 === 'B';
      const isQ4 = answers?.q4 === 'D' || answers?.q4 === 'C';
      const isQ5 = Array.isArray(answers?.q5) && ['A', 'B', 'C', 'D'].every(o => answers.q5.includes(o)) && answers.q5.length === 4;
      const score = (isQ1 ? 1 : 0) + (isQ2 ? 1 : 0) + (isQ3 ? 1 : 0) + (isQ4 ? 1 : 0) + (isQ5 ? 1 : 0);
      const isSolved = score === 5;

      try {
        await gameService.logSystem(
          sessionId,
          isSolved ? 'FORENSIC_SOLVE' : 'WARNING',
          'TRIBUNAL',
          `High Tribunal Accusation filed by ${teamId || 'Investigator'}: ${score}/5 correct. Result: ${isSolved ? 'CASE SOLVED - ELENA WARD GUILTY' : 'INCOMPLETE/INCORRECT'}`
        );
      } catch (_) {}

      return res.status(200).json({
        success: true,
        verdict: {
          isSolved,
          score,
          details: { isQ1, isQ2, isQ3, isQ4, isQ5 }
        }
      });
    }

    // Gameplay: Submit Accusation
    if (action === 'SUBMIT_ACCUSATION') {
      const { suspectTeamId, attachedEvidenceIds, notes } = payload;
      const { data: accuser } = await supabase.from('teams').select('*').eq('session_id', sessionId).eq('id', teamId).single();
      const { data: suspect } = await supabase.from('teams').select('*').eq('session_id', sessionId).eq('id', suspectTeamId).single();

      if (!accuser || !suspect) {
        return res.status(400).json({ success: false, message: 'Invalid accuser or suspect' });
      }

      const accusation = {
        id: 'ACC-' + Date.now(),
        accusingTeamId: accuser.id,
        accusingTeamName: accuser.name,
        suspectTeamId: suspect.id,
        suspectTeamName: suspect.name,
        attachedEvidenceIds: attachedEvidenceIds || [],
        indictmentNotes: notes || 'Forensic evidence indicates malicious infiltration.',
        votesGuilty: 0,
        votesNotGuilty: 0,
        timestamp: new Date().toISOString()
      };

      await supabase.from('game_sessions').update({
        current_phase: 'DEFENCE_PHASE',
        phase_timer_seconds: 45,
        active_accusation: accusation,
        defense_statement: null,
        jury_votes: {}
      }).eq('id', sessionId);

      await gameService.logSystem(sessionId, 'INDICTMENT', 'TRIBUNAL', `EMERGENCY: Team ${accuser.id} formally accuses Team ${suspect.id}!`);

      return res.status(200).json({ success: true, message: 'Indictment filed! Commencing 45-second Defence Phase.' });
    }

    // Gameplay: Cast Jury Vote
    if (action === 'CAST_JURY_VOTE') {
      const { vote } = payload;
      const votes = session.jury_votes || {};
      votes[teamId] = vote;

      await supabase.from('game_sessions').update({ jury_votes: votes }).eq('id', sessionId);
      return res.status(200).json({ success: true, message: `Vote recorded: ${vote}` });
    }

    // Gameplay: Send Chat
    if (action === 'SEND_CHAT') {
      const { channel, text, evidenceAttachment } = payload;
      const { data: team } = await supabase.from('teams').select('*').eq('session_id', sessionId).eq('id', teamId).single();

      const chatRecord = {
        session_id: sessionId,
        sender_team_id: teamId || 'SPECTATOR',
        sender_team_name: team ? team.name : 'Operator',
        channel: channel || 'PUBLIC',
        text: text || '',
        evidence_attachment: evidenceAttachment || null,
        created_at: new Date().toISOString()
      };

      await supabase.from('game_chat').insert(chatRecord);
      return res.status(200).json({ success: true, message: 'Message delivered', chatRecord });
    }

    return res.status(400).json({ success: false, message: `Unknown action: ${action}` });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
