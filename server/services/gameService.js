// server/services/gameService.js
// Core Authoritative Service for CYBER MAFIA on Vercel + Supabase

const { getServiceClient, switchToMockDatabase, isSchemaCacheOrTableMissingError } = require('../db/supabaseClient');
const crypto = require('crypto');
const { generateHackerChallenge, generateCivilianLabChallenges } = require('../game/challenges');
const EvidenceManager = require('../game/evidence');

// Default squads if not yet initialized in DB
const DEFAULT_SQUAD_NAMES = [
  'Ghost Protocol', 'Cyber Sentinel', 'Phantom Root', 'Zero Day Ops',
  'Quantum Shield', 'Binary Vanguard', 'Dark Matrix', 'Cipher Guard',
  'Echo Infiltrator', 'Aegis Core', 'Apex Predator', 'Stealth Daemon',
  'Firewall Elite', 'Black Ice', 'Shadow Nexus'
];

const CASE_SUSPECTS = [
  { id: 'S01', name: 'Dr. Mira Sen', role: 'CIVILIAN', suspicion: 'HIGH' },
  { id: 'S02', name: 'Noah Mercer', role: 'CIVILIAN', suspicion: 'HIGH' },
  { id: 'S03', name: 'Felix Grant', role: 'CIVILIAN', suspicion: 'CRITICAL' },
  { id: 'S04', name: 'Elena Ward', role: 'HACKER', suspicion: 'MEDIUM' }
];

class GameService {
  constructor() {
    this.supabase = getServiceClient();
    this.evidenceManager = new EvidenceManager();
  }

  // =========================================================================
  // 1. SESSION MANAGEMENT & INITIALIZATION
  // =========================================================================

  async getOrCreateSession(sessionId = 'default-cyber-session', teamCount = 8, hackerCount = 2) {
    const supabase = getServiceClient();

    // Check if session exists
    let { data: session, error } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (error && error.code !== 'PGRST116') {
      if (isSchemaCacheOrTableMissingError(error)) {
        console.warn(`[getOrCreateSession] Schema cache missing table 'game_sessions'. Activating in-memory store.`);
        switchToMockDatabase('Table public.game_sessions missing in schema cache');
        return await this.getOrCreateSession(sessionId, teamCount, hackerCount);
      }
      console.warn(`[getOrCreateSession] DB lookup warning for session ${sessionId}:`, error.message);
    }

    if (!session || error) {
      const now = new Date().toISOString();
      const newSession = {
        id: sessionId,
        status: 'NOT_STARTED',
        current_phase: 'LOBBY',
        current_round: 1,
        max_rounds: 5,
        phase_timer_seconds: 120,
        phase_duration_seconds: 120,
        phase_started_at: null,
        created_at: now,
        started_at: null,
        ended_at: null,
        is_paused: false,
        pause_started_at: null,
        accumulated_paused_seconds: 0,
        last_meaningful_update: now,
        scoring_rules: {
          COMPROMISE_SUCCESS: 100,
          SOLVE_INVESTIGATION_CTF: 75,
          CORRECT_HACKER_ACCUSATION: 300,
          SURVIVE_ROUND: 50,
          FALSE_ACCUSATION_PENALTY: -100,
          FAILED_ATTACK_PENALTY: -25,
          SUCCESSFUL_DECEPTION: 100
        },
        active_accusation: null,
        defense_statement: null,
        jury_votes: {},
        reveal_result: null,
        active_spoofs: {},
        metadata: { teamCount, hackerCount }
      };

      const { error: insErr } = await supabase.from('game_sessions').insert(newSession);
      if (insErr) {
        if (insErr.code === '23505') {
          // Concurrently created by another request; load it
          const { data: reloadedSession } = await supabase.from('game_sessions').select('*').eq('id', sessionId).single();
          if (reloadedSession) return reloadedSession;
        } else if (isSchemaCacheOrTableMissingError(insErr)) {
          console.warn(`[getOrCreateSession] Schema cache missing table 'game_sessions' on insert. Activating in-memory store.`);
          switchToMockDatabase('Table public.game_sessions missing on insert');
          return await this.getOrCreateSession(sessionId, teamCount, hackerCount);
        } else {
          throw new Error(`Database error creating game session: ${insErr.message}`);
        }
      }
      session = newSession;

      // Initialize default teams
      await this.initTeamsForSession(sessionId, teamCount, hackerCount);
    }

    return session;
  }

  async initTeamsForSession(sessionId, count = 8, hackerCount = 2) {
    const supabase = getServiceClient();
    const teams = [];

    for (let i = 1; i <= count; i++) {
      const id = (i < 10 ? 'C0' : 'C') + i;
      teams.push({
        id,
        session_id: sessionId,
        name: DEFAULT_SQUAD_NAMES[i - 1] || `Sector ${id}`,
        role: 'CIVILIAN',
        secret_revealed: false,
        integrity: 100,
        score: 0,
        is_bot: true,
        is_eliminated: false,
        modules: {
          dashboard: 'ACTIVE',
          investigation: 'ACTIVE',
          evidenceVault: 'ACTIVE',
          networkMonitor: 'ACTIVE'
        },
        players: [],
        attack_history: [],
        evidence_count: 0,
        suspicion: 'LOW',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }

    const { error: teamsErr } = await supabase.from('teams').upsert(teams);
    if (teamsErr) {
      throw new Error(`Database error initializing teams: ${teamsErr.message}`);
    }

    // Initialize team progress for Level 1 (Round 1)
    const progressList = teams.map(t => ({
      session_id: sessionId,
      team_id: t.id,
      level_id: 1,
      status: 'IN_PROGRESS',
      validated_challenges: [],
      progress_data: {},
      score_contribution: 0,
      started_at: new Date().toISOString(),
      last_checkpoint_at: new Date().toISOString(),
      revision: 1
    }));

    const { error: progErr } = await supabase.from('team_progress').upsert(progressList);
    if (progErr) {
      throw new Error(`Database error initializing team progress: ${progErr.message}`);
    }
    return teams;
  }

  // =========================================================================
  // 2. PLAYER JOIN & ROSTER
  // =========================================================================

  async joinTeam(sessionId, playerName, teamId, socketOrClientId, options = {}) {
    const supabase = getServiceClient();
    const session = await this.getOrCreateSession(sessionId);

    const { teamName, systemNo } = (typeof options === 'object' && options !== null) ? options : {};
    const suspect = CASE_SUSPECTS.find(s => s.id === teamId);
    const authoritativeName = (teamName && teamName.trim())
      || (suspect ? suspect.name : ((playerName && playerName.trim()) || `Squad ${teamId}`));
    const cleanSystemNo = (systemNo && systemNo.trim()) || 'SYS-01';

    let { data: team } = await supabase
      .from('teams')
      .select('*')
      .eq('session_id', sessionId)
      .eq('id', teamId)
      .single();

    if (!team) {
      const suspect = CASE_SUSPECTS.find(s => s.id === teamId);
      const newTeam = {
        id: teamId,
        session_id: sessionId,
        name: authoritativeName,
        system_no: cleanSystemNo,
        role: suspect ? suspect.role : 'CIVILIAN',
        secret_revealed: false,
        integrity: 100,
        score: 0,
        is_bot: false,
        is_active: true,
        is_eliminated: false,
        status: 'ACTIVE',
        removal_reason: null,
        last_seen_at: new Date().toISOString(),
        modules: {
          dashboard: 'ACTIVE',
          investigation: 'ACTIVE',
          evidenceVault: 'ACTIVE',
          networkMonitor: 'ACTIVE'
        },
        players: [],
        attack_history: [],
        evidence_count: 0,
        suspicion: suspect ? suspect.suspicion : 'LOW',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      await supabase.from('teams').upsert(newTeam);
      team = newTeam;
    }

    const players = Array.isArray(team.players) ? [...team.players] : [];
    const existingPlayerIdx = players.findIndex(p => p.name === playerName || p.clientId === socketOrClientId);

    if (existingPlayerIdx >= 0) {
      players[existingPlayerIdx].lastSeen = new Date().toISOString();
      if (cleanSystemNo) players[existingPlayerIdx].systemNo = cleanSystemNo;
    } else {
      if (players.length >= 5) {
        throw new Error(`Team ${teamId} is full`);
      }
      players.push({
        clientId: socketOrClientId || 'CLI_' + crypto.randomBytes(3).toString('hex'),
        name: playerName || authoritativeName,
        systemNo: cleanSystemNo,
        joinedAt: new Date().toISOString()
      });
    }

    const updatePayload = {
      name: authoritativeName,
      system_no: cleanSystemNo,
      players,
      is_bot: false,
      is_active: true,
      is_eliminated: false,
      status: 'ACTIVE',
      removal_reason: null,
      last_seen_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: updatedTeam, error: updErr } = await supabase
      .from('teams')
      .update(updatePayload)
      .eq('session_id', sessionId)
      .eq('id', teamId)
      .single();

    if (updErr) {
      throw new Error(`Database error joining team: ${updErr.message}`);
    }

    // Ensure team progress for level 1 exists
    const { data: existingProg } = await supabase
      .from('team_progress')
      .select('id')
      .eq('session_id', sessionId)
      .eq('team_id', teamId)
      .eq('level_id', 1)
      .single();

    if (!existingProg) {
      await supabase.from('team_progress').upsert({
        session_id: sessionId,
        team_id: teamId,
        level_id: 1,
        status: 'IN_PROGRESS',
        validated_challenges: [],
        progress_data: {},
        score_contribution: 0,
        started_at: new Date().toISOString(),
        last_checkpoint_at: new Date().toISOString(),
        revision: 1
      });
    }

    return updatedTeam || { ...team, ...updatePayload };
  }

  // =========================================================================
  // 3. AUTHORITATIVE LIFECYCLE (START, PAUSE, RESUME, END, TIMING)
  // =========================================================================

  async startGame(sessionId) {
    const supabase = getServiceClient();
    const session = await this.getOrCreateSession(sessionId);

    // Prevent duplicate start
    if (session.status === 'RUNNING' || session.status === 'PAUSED' || session.status === 'COMPLETED') {
      return { success: false, message: 'Game has already been started or completed.', session };
    }

    const now = new Date().toISOString();

    // Assign secret roles deterministically
    const { data: teams, error: teamsErr } = await supabase
      .from('teams')
      .select('*')
      .eq('session_id', sessionId);

    if (teamsErr) {
      throw new Error(`Database error fetching teams for role assignment: ${teamsErr.message}`);
    }

    const hackerCount = session.metadata?.hackerCount || 2;
    const shuffled = [...(teams || [])].sort(() => Math.random() - 0.5);

    for (let i = 0; i < (teams || []).length; i++) {
      const isHacker = i < hackerCount;
      const t = shuffled[i];
      const { error: roleErr } = await supabase
        .from('teams')
        .update({
          role: isHacker ? 'HACKER' : 'CIVILIAN',
          secret_revealed: false,
          integrity: 100,
          updated_at: now
        })
        .eq('session_id', sessionId)
        .eq('id', t.id);

      if (roleErr) {
        throw new Error(`Database error assigning role to team ${t.id}: ${roleErr.message}`);
      }
    }

    // Update Session
    const updated = {
      status: 'RUNNING',
      current_phase: 'ROLE_ASSIGNMENT',
      current_round: 1,
      started_at: now,
      phase_started_at: now,
      phase_timer_seconds: 10,
      phase_duration_seconds: 10,
      is_paused: false,
      last_meaningful_update: now
    };

    const { error: sessErr } = await supabase
      .from('game_sessions')
      .update(updated)
      .eq('id', sessionId);

    if (sessErr) {
      throw new Error(`Database error updating session for start: ${sessErr.message}`);
    }

    // System log
    await this.logSystem(sessionId, 'GAME_START', 'CORE', 'CYBER MAFIA initiated. Secret roles assigned.');

    return { success: true, message: 'Game started successfully.', session: { ...session, ...updated } };
  }

  async pauseGame(sessionId, adminIdentity = 'SYSTEM_ADMIN') {
    const supabase = getServiceClient();
    const session = await this.getOrCreateSession(sessionId);

    if (session.status === 'COMPLETED') {
      return { success: false, message: 'Cannot pause a completed match.', session };
    }

    // Idempotent: If already paused, return current state without corrupting timestamps
    if (session.is_paused || session.status === 'PAUSED') {
      return { success: true, message: 'Match is already paused.', session };
    }

    const now = new Date().toISOString();
    const updates = {
      status: 'PAUSED',
      is_paused: true,
      pause_started_at: now,
      last_meaningful_update: now
    };

    const { error: pauseErr } = await supabase
      .from('game_sessions')
      .update(updates)
      .eq('id', sessionId);

    if (pauseErr) {
      throw new Error(`Database error pausing game: ${pauseErr.message}`);
    }

    // Audit log
    await this.recordAuditLog({
      sessionId,
      adminIdentity,
      actionType: 'PAUSE_GAME',
      reason: 'Administrator paused active gameplay session.',
      previousState: { status: session.status, is_paused: session.is_paused },
      resultingState: updates
    });

    await this.logSystem(sessionId, 'GAME_PAUSE', 'ADMIN', 'Gameplay paused by administrator.');

    return { success: true, message: 'Game paused successfully.', session: { ...session, ...updates } };
  }

  async resumeGame(sessionId, adminIdentity = 'SYSTEM_ADMIN') {
    const supabase = getServiceClient();
    const session = await this.getOrCreateSession(sessionId);

    if (session.status === 'COMPLETED') {
      return { success: false, message: 'Cannot resume a completed match.', session };
    }

    // Idempotent: If not paused, do not add duplicate paused time
    if (!session.is_paused && session.status !== 'PAUSED') {
      return { success: true, message: 'Match is already running.', session };
    }

    const now = new Date();
    const pauseStarted = session.pause_started_at ? new Date(session.pause_started_at) : now;
    const additionalPausedSeconds = Math.max(0, Math.floor((now.getTime() - pauseStarted.getTime()) / 1000));
    const accumulatedPausedSeconds = (session.accumulated_paused_seconds || 0) + additionalPausedSeconds;

    const updates = {
      status: 'RUNNING',
      is_paused: false,
      pause_started_at: null,
      accumulated_paused_seconds: accumulatedPausedSeconds,
      last_meaningful_update: now.toISOString()
    };

    const { error: resumeErr } = await supabase
      .from('game_sessions')
      .update(updates)
      .eq('id', sessionId);

    if (resumeErr) {
      throw new Error(`Database error resuming game: ${resumeErr.message}`);
    }

    // Audit log
    await this.recordAuditLog({
      sessionId,
      adminIdentity,
      actionType: 'RESUME_GAME',
      reason: `Match resumed. Paused duration added: ${additionalPausedSeconds}s.`,
      previousState: { status: session.status, is_paused: true },
      resultingState: updates
    });

    await this.logSystem(sessionId, 'GAME_RESUME', 'ADMIN', `Gameplay resumed after ${additionalPausedSeconds}s pause.`);

    return { success: true, message: 'Game resumed successfully.', session: { ...session, ...updates } };
  }

  async endGame(sessionId, adminIdentity = 'SYSTEM_ADMIN', reason = 'Match concluded') {
    const supabase = getServiceClient();
    const session = await this.getOrCreateSession(sessionId);

    // Prevent duplicate end operations
    if (session.status === 'COMPLETED') {
      return { success: false, message: 'Match has already ended.', session };
    }

    const now = new Date();
    let accumulatedPausedSeconds = session.accumulated_paused_seconds || 0;

    // If game ended while paused, close the final pause interval
    if (session.is_paused && session.pause_started_at) {
      const pauseStarted = new Date(session.pause_started_at);
      accumulatedPausedSeconds += Math.max(0, Math.floor((now.getTime() - pauseStarted.getTime()) / 1000));
    }

    const updates = {
      status: 'COMPLETED',
      current_phase: 'GAME_OVER',
      is_paused: false,
      pause_started_at: null,
      accumulated_paused_seconds: accumulatedPausedSeconds,
      ended_at: now.toISOString(),
      last_meaningful_update: now.toISOString()
    };

    const { error: endErr } = await supabase
      .from('game_sessions')
      .update(updates)
      .eq('id', sessionId);

    if (endErr) {
      throw new Error(`Database error ending game: ${endErr.message}`);
    }

    // Reveal all roles upon game over
    const { data: teams } = await supabase.from('teams').select('*').eq('session_id', sessionId);
    for (const t of (teams || [])) {
      await supabase
        .from('teams')
        .update({ secret_revealed: true })
        .eq('session_id', sessionId)
        .eq('id', t.id);
    }

    // Audit log
    await this.recordAuditLog({
      sessionId,
      adminIdentity,
      actionType: 'END_GAME',
      reason,
      previousState: { status: session.status },
      resultingState: updates
    });

    await this.logSystem(sessionId, 'GAME_OVER', 'CORE', `Match concluded. Final standings locked.`);

    return { success: true, message: 'Game completed successfully.', session: { ...session, ...updates } };
  }

  // Calculate authoritative active gameplay duration
  calculateElapsedTiming(session) {
    if (!session || !session.started_at) {
      return {
        wallClockSeconds: 0,
        pausedSeconds: 0,
        activeGameplaySeconds: 0
      };
    }

    const startedAt = new Date(session.started_at).getTime();
    const endedAt = session.ended_at ? new Date(session.ended_at).getTime() : Date.now();

    const wallClockSeconds = Math.max(0, Math.floor((endedAt - startedAt) / 1000));
    let pausedSeconds = session.accumulated_paused_seconds || 0;

    // If currently paused, add active pause interval
    if (session.is_paused && session.pause_started_at) {
      const pauseStart = new Date(session.pause_started_at).getTime();
      const currentPauseInterval = Math.max(0, Math.floor((Date.now() - pauseStart) / 1000));
      pausedSeconds += currentPauseInterval;
    }

    const activeGameplaySeconds = Math.max(0, wallClockSeconds - pausedSeconds);

    return {
      wallClockSeconds,
      pausedSeconds,
      activeGameplaySeconds
    };
  }

  // =========================================================================
  // 4. AUTHORITATIVE SCORING & LEADERBOARD (PHASE 3)
  // =========================================================================

  async recordScoreEvent({ sessionId, teamId, levelId = 1, eventType, scoreDelta, idempotencyKey, metadata = {} }) {
    const supabase = getServiceClient();

    // Check if session is paused or completed
    const { data: session } = await supabase.from('game_sessions').select('*').eq('id', sessionId).single();
    if (session && (session.status === 'PAUSED' || session.is_paused)) {
      throw new Error('Action rejected: match is currently PAUSED.');
    }
    if (session && session.status === 'COMPLETED') {
      throw new Error('Action rejected: match is already COMPLETED.');
    }

    // Check if team is eliminated or removed by admin
    const { data: team } = await supabase.from('teams').select('id, is_active, is_eliminated, status, removal_reason').eq('session_id', sessionId).eq('id', teamId).single();
    if (team && (team.status === 'REMOVED_BY_ADMIN' || (team.is_eliminated && team.removal_reason))) {
      throw new Error(`Team ${teamId} has been removed by the administrator and cannot record score events.`);
    }

    // Check idempotency to prevent duplicate score awards
    const generatedKey = idempotencyKey || `${sessionId}_${teamId}_${eventType}_${levelId}_${Date.now()}`;
    const { data: existing } = await supabase
      .from('score_events')
      .select('id')
      .eq('idempotency_key', generatedKey)
      .single();

    if (existing) {
      return { success: false, duplicate: true, message: 'Score event already processed (idempotent duplicate).' };
    }

    const event = {
      session_id: sessionId,
      team_id: teamId,
      level_id: levelId,
      event_type: eventType,
      score_delta: scoreDelta,
      idempotency_key: generatedKey,
      metadata,
      created_at: new Date().toISOString()
    };

    const { error: insertErr } = await supabase.from('score_events').insert(event);
    if (insertErr) {
      if (insertErr.code === '23505' || insertErr.message?.includes('duplicate key') || insertErr.message?.includes('idempotency_key')) {
        return { success: false, duplicate: true, message: 'Score event already processed (idempotent duplicate).' };
      }
      throw new Error(`Failed to insert score event: ${insertErr.message}`);
    }

    // Recalculate team score
    const newScore = await this.recalculateTeamScore(sessionId, teamId);

    // Automatic progress persistence checkpoint after score change
    await this.saveProgressCheckpoint(sessionId, teamId, levelId, `Score event: ${eventType} (${scoreDelta > 0 ? '+' : ''}${scoreDelta})`);

    return { success: true, event, newScore };
  }

  async recalculateTeamScore(sessionId, teamId) {
    const supabase = getServiceClient();

    // 1. Attempt atomic PostgreSQL stored function if available
    try {
      if (typeof supabase.rpc === 'function') {
        const { data: rpcScore, error: rpcErr } = await supabase.rpc('recalculate_team_score', {
          p_session_id: sessionId,
          p_team_id: teamId
        });
        if (!rpcErr && typeof rpcScore === 'number') {
          return rpcScore;
        }
      }
    } catch (_) {
      // Fall through to query summation if RPC is not present
    }

    // 2. Query authoritative score_events ledger and sync teams table
    const { data: events, error: evErr } = await supabase
      .from('score_events')
      .select('score_delta')
      .eq('session_id', sessionId)
      .eq('team_id', teamId);

    if (evErr) {
      throw new Error(`Failed to fetch score events for recalculation: ${evErr.message}`);
    }

    const total = (events || []).reduce((sum, ev) => sum + (ev.score_delta || 0), 0);

    const { error: updErr } = await supabase
      .from('teams')
      .update({ score: total, updated_at: new Date().toISOString() })
      .eq('session_id', sessionId)
      .eq('id', teamId);

    if (updErr) {
      throw new Error(`Failed to update recalculated team score: ${updErr.message}`);
    }

    return total;
  }

  async getLeaderboard(sessionId, options = {}) {
    const supabase = getServiceClient();
    const activeOnly = options.activeOnly !== undefined ? options.activeOnly : false;
    const timeoutMs = options.timeoutMs || 90000;

    // Fetch session started_at to compute real playing times
    const { data: session } = await supabase
      .from('game_sessions')
      .select('id, started_at, status')
      .eq('id', sessionId)
      .single();

    const sessionStart = session?.started_at ? new Date(session.started_at).getTime() : null;

    const { data: teams, error } = await supabase
      .from('teams')
      .select('id, name, score, integrity, is_bot, is_active, is_eliminated, status, removal_reason, last_seen_at, players, system_no, updated_at, has_submitted_accusation, accusation_submitted_at, accusation_score, completed_stages, completed_levels')
      .eq('session_id', sessionId);

    if (error || !teams) {
      return [];
    }

    let candidateTeams = teams;
    if (activeOnly) {
      const now = Date.now();
      candidateTeams = teams.filter(t => {
        // Exclude bot teams
        if (t.is_bot) return false;

        // Exclude eliminated or admin-removed teams
        if (t.is_eliminated || t.status === 'REMOVED_BY_ADMIN' || t.removal_reason) return false;
        if (t.is_active === false) return false;

        // Must be genuinely joined by a real player
        const hasPlayers = (Array.isArray(t.players) && t.players.length > 0) || t.is_active === true;
        if (!hasPlayers) return false;

        // If team already submitted their final tribunal verdict, keep on leaderboard as completed
        if (t.has_submitted_accusation) return true;

        // Heartbeat timeout check: if last_seen_at is too old, consider disconnected/inactive
        if (t.last_seen_at) {
          const lastSeenMs = new Date(t.last_seen_at).getTime();
          if (!isNaN(lastSeenMs) && (now - lastSeenMs) > timeoutMs) {
            return false;
          }
        }
        return true;
      });
    }

    // Fetch team progress to determine levels completed and last checkpoint time
    const { data: progressRecords } = await supabase
      .from('team_progress')
      .select('team_id, level_id, status, last_checkpoint_at')
      .eq('session_id', sessionId);

    const progressMap = {};
    (progressRecords || []).forEach(p => {
      if (!progressMap[p.team_id]) {
        progressMap[p.team_id] = { completedLevels: 0, latestCheckpoint: p.last_checkpoint_at };
      }
      if (p.status === 'COMPLETED') {
        progressMap[p.team_id].completedLevels++;
      }
      if (new Date(p.last_checkpoint_at) > new Date(progressMap[p.team_id].latestCheckpoint)) {
        progressMap[p.team_id].latestCheckpoint = p.last_checkpoint_at;
      }
    });

    const formatDuration = (secs) => {
      if (secs === null || secs === undefined || isNaN(secs) || secs < 0) return '0s';
      const m = Math.floor(secs / 60);
      const s = Math.floor(secs % 60);
      return m > 0 ? `${m}m ${s}s` : `${s}s`;
    };

    // Calculate time taken and round info for each team
    const teamStats = candidateTeams.map(t => {
      const comp = (t.completed_stages !== undefined && t.completed_stages !== null)
        ? t.completed_stages
        : (progressMap[t.id]?.completedLevels || 0);
      const currentRound = Math.min(comp + 1, 5);
      const checkpointTime = progressMap[t.id]?.latestCheckpoint || t.updated_at || '';
      
      let elapsedSeconds = 0;
      if (sessionStart && checkpointTime) {
        elapsedSeconds = Math.max(0, Math.round((new Date(checkpointTime).getTime() - sessionStart) / 1000));
      }

      return {
        ...t,
        systemNo: t.system_no || (t.players && t.players[0]?.systemNo) || `SYS-${t.id}`,
        completedLevels: comp,
        currentRound,
        latestCheckpoint: checkpointTime,
        elapsedSeconds,
        timeFormatted: formatDuration(elapsedSeconds),
        hasSubmitted: Boolean(t.has_submitted_accusation),
        submittedAt: t.accusation_submitted_at || null,
        accusationScore: t.accusation_score ?? null
      };
    });

    // Deterministic sorting:
    // 1. Score DESC
    // 2. Completed Levels / Current Round DESC
    // 3. Earliest Checkpoint / Elapsed Time ASC (faster teams rank higher)
    // 4. Team ID ASC (final deterministic tie-breaker)
    const sorted = [...teamStats].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;

      if (b.completedLevels !== a.completedLevels) return b.completedLevels - a.completedLevels;

      const aTime = a.latestCheckpoint || '';
      const bTime = b.latestCheckpoint || '';
      if (aTime !== bTime) return aTime.localeCompare(bTime);

      return a.id.localeCompare(b.id);
    });

    return sorted.map((t, idx) => ({
      rank: idx + 1,
      teamId: t.id,
      teamName: t.name,
      systemNo: t.systemNo,
      score: t.score,
      integrity: t.integrity,
      isEliminated: Boolean(t.is_eliminated || t.isEliminated),
      completionStatus: (t.is_eliminated || t.isEliminated) ? 'ELIMINATED' : (t.hasSubmitted ? 'SUBMITTED' : 'ACTIVE'),
      completedLevels: t.completedLevels,
      currentRound: t.currentRound,
      elapsedSeconds: t.elapsedSeconds,
      timeFormatted: t.timeFormatted,
      latestCheckpoint: t.latestCheckpoint,
      hasSubmitted: t.hasSubmitted,
      submittedAt: t.submittedAt,
      accusationScore: t.accusationScore
    }));
  }

  async recordHeartbeat(sessionId, teamId) {
    const supabase = getServiceClient();
    const { data: team, error } = await supabase
      .from('teams')
      .select('id, name, is_active, is_eliminated, status, removal_reason')
      .eq('session_id', sessionId)
      .eq('id', teamId)
      .single();

    if (error || !team) {
      return { success: false, status: 'NOT_FOUND', message: 'Team not found' };
    }

    if (team.status === 'REMOVED_BY_ADMIN' || (team.is_eliminated && team.removal_reason)) {
      return {
        success: false,
        removed: true,
        status: 'REMOVED_BY_ADMIN',
        reason: team.removal_reason || 'Removed by administrator'
      };
    }

    const now = new Date().toISOString();
    await supabase.from('teams').update({
      is_active: true,
      last_seen_at: now,
      updated_at: now
    }).eq('session_id', sessionId).eq('id', teamId);

    return { success: true, status: 'ACTIVE', timestamp: now };
  }

  async removePlayer(sessionId, teamId, adminIdentity = 'ADMIN', reason = 'Removed by administrator') {
    const supabase = getServiceClient();

    const { data: team, error } = await supabase
      .from('teams')
      .select('*')
      .eq('session_id', sessionId)
      .eq('id', teamId)
      .single();

    if (error || !team) {
      throw new Error(`Team ${teamId} not found in session ${sessionId}`);
    }

    const now = new Date().toISOString();
    const { error: updErr } = await supabase
      .from('teams')
      .update({
        is_active: false,
        is_eliminated: true,
        status: 'REMOVED_BY_ADMIN',
        removal_reason: reason,
        removed_at: now,
        players: [],
        updated_at: now
      })
      .eq('session_id', sessionId)
      .eq('id', teamId);

    if (updErr) {
      throw new Error(`Failed to remove player: ${updErr.message}`);
    }

    // Record in admin audit logs
    await this.recordAuditLog({
      sessionId,
      adminIdentity,
      actionType: 'ADMIN_REMOVE_PLAYER',
      targetTeamId: teamId,
      previousState: { name: team.name, score: team.score, isActive: team.is_active },
      resultingState: { isActive: false, isEliminated: true, status: 'REMOVED_BY_ADMIN' },
      reason
    });

    await this.logSystem(
      sessionId,
      'ADMIN_REMOVAL',
      adminIdentity,
      `[ADMIN ACTION] Squad ${team.name} (${teamId}) was removed from session by administrator. Reason: ${reason}`
    );

    return {
      success: true,
      teamId,
      teamName: team.name,
      removedAt: now,
      reason
    };
  }

  // =========================================================================
  // 5. PROGRESS PERSISTENCE & CHECKPOINTS (PHASE 5)
  // =========================================================================

  async saveProgressCheckpoint(sessionId, teamId, levelId, reason = 'Automatic Progress Checkpoint') {
    const supabase = getServiceClient();

    // Check existing progress
    const { data: currentProgress } = await supabase
      .from('team_progress')
      .select('*')
      .eq('session_id', sessionId)
      .eq('team_id', teamId)
      .eq('level_id', levelId)
      .single();

    const nextRevision = currentProgress ? (currentProgress.revision || 1) + 1 : 1;
    const now = new Date().toISOString();

    const progressRecord = {
      session_id: sessionId,
      team_id: teamId,
      level_id: levelId,
      status: currentProgress?.status || 'IN_PROGRESS',
      validated_challenges: currentProgress?.validated_challenges || [],
      progress_data: currentProgress?.progress_data || {},
      score_contribution: currentProgress?.score_contribution || 0,
      started_at: currentProgress?.started_at || now,
      last_checkpoint_at: now,
      revision: nextRevision
    };

    const { error: upsertErr } = await supabase.from('team_progress').upsert(progressRecord);
    if (upsertErr) {
      throw new Error(`Database error saving progress checkpoint: ${upsertErr.message}`);
    }

    // Create persistent recovery snapshot
    const { data: team } = await supabase
      .from('teams')
      .select('score')
      .eq('session_id', sessionId)
      .eq('id', teamId)
      .single();

    const snapshotId = 'SNAP_' + crypto.randomBytes(4).toString('hex');
    const snapshot = {
      id: snapshotId,
      session_id: sessionId,
      team_id: teamId,
      level_id: levelId,
      revision: nextRevision,
      created_at: now,
      progress_state: progressRecord,
      validated_challenges: progressRecord.validated_challenges,
      score_at_snapshot: team?.score || 0,
      score_metadata: { checkpointReason: reason },
      reason
    };

    const { error: snapErr } = await supabase.from('recovery_snapshots').insert(snapshot);
    if (snapErr) {
      throw new Error(`Database error saving recovery snapshot: ${snapErr.message}`);
    }
    return { progressRecord, snapshot };
  }

  // Reconnection reconciliation
  async reconnectTeam(sessionId, teamId) {
    const supabase = getServiceClient();

    const { data: session } = await supabase.from('game_sessions').select('*').eq('id', sessionId).single();
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const { data: team } = await supabase.from('teams').select('*').eq('session_id', sessionId).eq('id', teamId).single();
    if (!team) {
      throw new Error(`Team ${teamId} not found`);
    }

    if (team.status === 'REMOVED_BY_ADMIN' || (team.is_eliminated && team.removal_reason)) {
      throw new Error(`Team ${teamId} has been removed by the administrator and cannot reconnect.`);
    }

    await supabase.from('teams').update({
      is_active: true,
      last_seen_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }).eq('session_id', sessionId).eq('id', teamId);

    // Load active level progress
    const currentRound = session.current_round || 1;
    let { data: progress } = await supabase
      .from('team_progress')
      .select('*')
      .eq('session_id', sessionId)
      .eq('team_id', teamId)
      .eq('level_id', currentRound)
      .single();

    if (!progress) {
      // Create if missing
      progress = {
        session_id: sessionId,
        team_id: teamId,
        level_id: currentRound,
        status: 'IN_PROGRESS',
        validated_challenges: [],
        progress_data: {},
        score_contribution: 0,
        started_at: new Date().toISOString(),
        last_checkpoint_at: new Date().toISOString(),
        revision: 1
      };
      await supabase.from('team_progress').insert(progress);
    }

    return {
      session,
      team,
      currentProgress: progress,
      elapsedTiming: this.calculateElapsedTiming(session)
    };
  }

  // =========================================================================
  // 6. ADMINISTRATIVE RECOVERY SNAPSHOTS (PHASE 6)
  // =========================================================================

  async getSnapshotHistory(sessionId, teamId, levelId) {
    const supabase = getServiceClient();

    let query = supabase
      .from('recovery_snapshots')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false });

    if (teamId) {
      query = query.eq('team_id', teamId);
    }
    if (levelId) {
      query = query.eq('level_id', levelId);
    }

    const { data: snapshots, error } = await query;
    return snapshots || [];
  }

  async restoreSnapshot({ sessionId, snapshotId, adminIdentity, reason }) {
    const supabase = getServiceClient();

    // Verify snapshot exists and belongs to session
    const { data: snapshot, error } = await supabase
      .from('recovery_snapshots')
      .select('*')
      .eq('id', snapshotId)
      .single();

    if (!snapshot || snapshot.session_id !== sessionId) {
      throw new Error('Snapshot not found or does not belong to this game session.');
    }

    const { team_id: teamId, level_id: levelId } = snapshot;

    // Get current pre-restoration state
    const { data: currentProgress } = await supabase
      .from('team_progress')
      .select('*')
      .eq('session_id', sessionId)
      .eq('team_id', teamId)
      .eq('level_id', levelId)
      .single();

    // Save pre-restoration safety snapshot
    if (currentProgress) {
      await supabase.from('recovery_snapshots').insert({
        session_id: sessionId,
        team_id: teamId,
        level_id: levelId,
        revision: (currentProgress.revision || 1) + 1,
        created_at: new Date().toISOString(),
        progress_state: currentProgress,
        validated_challenges: currentProgress.validated_challenges,
        score_at_snapshot: snapshot.score_at_snapshot,
        score_metadata: { preRestore: true },
        reason: `Pre-restoration backup prior to restoring snapshot ${snapshotId}`
      });
    }

    // Atomic Restoration
    const restoredRevision = (currentProgress?.revision || snapshot.revision || 1) + 2;
    const restoredProgress = {
      ...snapshot.progress_state,
      revision: restoredRevision,
      last_checkpoint_at: new Date().toISOString()
    };

    const { error: restErr } = await supabase.from('team_progress').upsert(restoredProgress);
    if (restErr) {
      throw new Error(`Database error restoring team progress: ${restErr.message}`);
    }

    // Reconcile score: insert compensating score event if snapshot score differs
    const { data: team } = await supabase
      .from('teams')
      .select('score')
      .eq('session_id', sessionId)
      .eq('id', teamId)
      .single();

    const currentScore = team?.score || 0;
    const targetScore = snapshot.score_at_snapshot || 0;
    const adjustment = targetScore - currentScore;

    if (adjustment !== 0) {
      const { error: scoreAdjErr } = await supabase.from('score_events').insert({
        session_id: sessionId,
        team_id: teamId,
        level_id: levelId,
        event_type: 'ADMIN_RESTORE_ADJUSTMENT',
        score_delta: adjustment,
        idempotency_key: `restore_${snapshotId}_${Date.now()}`,
        metadata: { snapshotId, adminIdentity, reason },
        created_at: new Date().toISOString()
      });
      if (scoreAdjErr) {
        throw new Error(`Database error creating restore score adjustment: ${scoreAdjErr.message}`);
      }
      await this.recalculateTeamScore(sessionId, teamId);
    }

    // Record in Audit Log
    await this.recordAuditLog({
      sessionId,
      adminIdentity,
      actionType: 'RESTORE_SNAPSHOT',
      targetTeamId: teamId,
      targetLevelId: levelId,
      previousState: currentProgress,
      resultingState: restoredProgress,
      reason: reason || 'Administrative snapshot restoration.'
    });

    await this.logSystem(sessionId, 'ADMIN_RECOVERY', 'TRIBUNAL', `Restored snapshot ${snapshotId} for Team ${teamId} (Level ${levelId}).`);

    return {
      success: true,
      restoredProgress,
      scoreAdjustment: adjustment,
      newScore: targetScore
    };
  }

  // Administrative Reset Operations
  async resetTeamLevel(sessionId, teamId, levelId, adminIdentity, reason) {
    const supabase = getServiceClient();

    const { data: currentProgress } = await supabase
      .from('team_progress')
      .select('*')
      .eq('session_id', sessionId)
      .eq('team_id', teamId)
      .eq('level_id', levelId)
      .single();

    const resetProgress = {
      session_id: sessionId,
      team_id: teamId,
      level_id: levelId,
      status: 'RESET',
      validated_challenges: [],
      progress_data: {},
      score_contribution: 0,
      started_at: new Date().toISOString(),
      last_checkpoint_at: new Date().toISOString(),
      revision: (currentProgress?.revision || 1) + 1
    };

    const { error: resetErr } = await supabase.from('team_progress').upsert(resetProgress);
    if (resetErr) {
      throw new Error(`Database error resetting team level: ${resetErr.message}`);
    }

    await this.recordAuditLog({
      sessionId,
      adminIdentity,
      actionType: 'RESET_TEAM_LEVEL',
      targetTeamId: teamId,
      targetLevelId: levelId,
      previousState: currentProgress,
      resultingState: resetProgress,
      reason: reason || `Reset progress for team ${teamId} on level ${levelId}`
    });

    return resetProgress;
  }

  async resetTeamEntireProgress(sessionId, teamId, adminIdentity, reason) {
    const supabase = getServiceClient();

    // Reset all level progress
    const { data: allProgress } = await supabase
      .from('team_progress')
      .select('*')
      .eq('session_id', sessionId)
      .eq('team_id', teamId);

    for (const p of (allProgress || [])) {
      await this.resetTeamLevel(sessionId, teamId, p.level_id, adminIdentity, reason);
    }

    // Compensate score events with a zeroing entry
    const currentScore = await this.recalculateTeamScore(sessionId, teamId);
    if (currentScore !== 0) {
      const { error: compErr } = await supabase.from('score_events').insert({
        session_id: sessionId,
        team_id: teamId,
        level_id: 1,
        event_type: 'ADMIN_FULL_RESET',
        score_delta: -currentScore,
        idempotency_key: `full_reset_${teamId}_${Date.now()}`,
        metadata: { adminIdentity, reason },
        created_at: new Date().toISOString()
      });
      if (compErr) {
        throw new Error(`Database error zeroing team score: ${compErr.message}`);
      }
      await this.recalculateTeamScore(sessionId, teamId);
    }

    // Reset team integrity and score
    const { error: teamResetErr } = await supabase
      .from('teams')
      .update({
        integrity: 100,
        score: 0,
        is_eliminated: false,
        updated_at: new Date().toISOString()
      })
      .eq('session_id', sessionId)
      .eq('id', teamId);

    if (teamResetErr) {
      throw new Error(`Database error resetting team integrity/score: ${teamResetErr.message}`);
    }

    await this.recordAuditLog({
      sessionId,
      adminIdentity,
      actionType: 'RESET_TEAM_ENTIRE',
      targetTeamId: teamId,
      previousState: { allProgress },
      resultingState: { integrity: 100, score: 0 },
      reason: reason || `Full progress reset for team ${teamId}`
    });

    return { success: true, message: `Team ${teamId} progress completely reset.` };
  }

  // =========================================================================
  // 7. EXPORT FINAL RESULTS TO CSV (PHASE 7)
  // =========================================================================

  // Security: Escape spreadsheet formula characters (=, +, -, @, \t, \r)
  sanitizeForCsv(value) {
    if (value === null || value === undefined) return '';
    let str = String(value);

    // If starts with formula triggers, prepend single quote
    if (/^[=+\-@\t\r]/.test(str)) {
      str = "'" + str;
    }

    // If string contains comma, double-quote, or newline, wrap in quotes and escape quotes
    if (/[",\n\r]/.test(str)) {
      str = `"${str.replace(/"/g, '""')}"`;
    }

    return str;
  }

  async generateFinalResultsCsv(sessionId) {
    let session = null;
    try {
      session = await this.getOrCreateSession(sessionId);
    } catch (_) {
      session = { id: sessionId, status: 'RUNNING', started_at: new Date().toISOString() };
    }

    if (!session) {
      session = { id: sessionId, status: 'RUNNING', started_at: new Date().toISOString() };
    }

    const leaderboard = await this.getLeaderboard(sessionId);
    const timing = this.calculateElapsedTiming(session);

    const isProvisional = session.status !== 'COMPLETED';

    // Required CSV headers:
    // Rank, Team ID, Team Name, Final Score, Completion Status, Levels Completed, Game Start Timestamp, Game End Timestamp, Total Wall-Clock Duration, Total Paused Duration, Active Gameplay Duration
    const headers = [
      'Rank',
      'Team ID',
      'Team Name',
      'Final Score',
      'Completion Status',
      'Levels Completed',
      'Game Start Timestamp',
      'Game End Timestamp',
      'Total Wall-Clock Duration (s)',
      'Total Paused Duration (s)',
      'Active Gameplay Duration (s)'
    ];

    const rows = leaderboard.map(row => [
      row.rank,
      this.sanitizeForCsv(row.teamId),
      this.sanitizeForCsv(row.teamName),
      row.score,
      isProvisional ? `${row.completionStatus} (PROVISIONAL)` : row.completionStatus,
      row.completedLevels,
      this.sanitizeForCsv(session.started_at || 'NOT_STARTED'),
      this.sanitizeForCsv(session.ended_at || (isProvisional ? 'IN_PROGRESS' : 'UNKNOWN')),
      timing.wallClockSeconds,
      timing.pausedSeconds,
      timing.activeGameplaySeconds
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\r\n');

    const filename = `cyber_mafia_results_${sessionId}_${new Date().toISOString().split('T')[0]}.csv`;

    return {
      csvContent,
      filename,
      isProvisional,
      totalTeams: leaderboard.length
    };
  }

  // =========================================================================
  // 8. LOGGING & AUDIT UTILITIES
  // =========================================================================

  async logSystem(sessionId, type, source, message) {
    const supabase = getServiceClient();
    const { error } = await supabase.from('game_logs').insert({
      session_id: sessionId,
      log_type: type,
      source,
      message,
      created_at: new Date().toISOString()
    });
    if (error) {
      console.warn(`[logSystem] Failed to insert game log: ${error.message}`);
    }
  }

  async recordAuditLog({ sessionId, adminIdentity, actionType, targetTeamId = null, targetLevelId = null, previousState = null, resultingState = null, reason }) {
    const supabase = getServiceClient();
    const { error } = await supabase.from('admin_audit_logs').insert({
      session_id: sessionId,
      admin_identity: adminIdentity || 'SYSTEM_ADMIN',
      action_type: actionType,
      target_team_id: targetTeamId,
      target_level_id: targetLevelId,
      previous_state: previousState,
      resulting_state: resultingState,
      reason: reason || 'Administrative action',
      created_at: new Date().toISOString()
    });
    if (error) {
      console.warn(`[recordAuditLog] Failed to insert admin audit log: ${error.message}`);
    }
  }

  // Safe sanitized state generator for client
  async getClientState(sessionId, teamId = null, isAdmin = false) {
    const supabase = getServiceClient();
    const session = await this.getOrCreateSession(sessionId);

    const { data: allTeams } = await supabase
      .from('teams')
      .select('*')
      .eq('session_id', sessionId);

    const myTeam = (allTeams || []).find(t => t.id === teamId);
    const myRole = myTeam ? myTeam.role : 'SPECTATOR';

    const now = Date.now();
    const timeoutMs = 90000;

    // Filter to real, active squads for live state:
    // Exclude unjoined placeholder bots, disconnected players, and squads removed by administrator
    const activeEligibleTeams = (allTeams || []).filter(t => {
      // Exclude placeholder bot teams
      if (t.is_bot && (!Array.isArray(t.players) || t.players.length === 0)) return false;
      // Exclude squads removed by administrator or marked inactive
      if (t.status === 'REMOVED_BY_ADMIN' || (t.is_eliminated && t.removal_reason) || t.is_active === false) {
        return false;
      }
      // Must be genuinely joined by a real player
      const hasPlayers = (Array.isArray(t.players) && t.players.length > 0) || t.is_active === true;
      if (!hasPlayers) return false;

      // If team already submitted their final tribunal verdict, keep on live state as completed
      if (t.has_submitted_accusation) return true;

      // Heartbeat timeout check: if last_seen_at is too old, consider disconnected/inactive
      if (t.last_seen_at) {
        const lastSeenMs = new Date(t.last_seen_at).getTime();
        if (!isNaN(lastSeenMs) && (now - lastSeenMs) > timeoutMs) {
          return false;
        }
      }
      return true;
    });

    // Mask secret roles of other teams unless revealed or admin
    const sanitizedTeams = activeEligibleTeams.map(t => {
      const isSelf = t.id === teamId;
      const isHackerAlly = myRole === 'HACKER' && t.role === 'HACKER';
      const showSecret = isAdmin || t.secret_revealed || isSelf || isHackerAlly;

      return {
        id: t.id,
        name: t.name,
        systemNo: t.system_no || (t.players && t.players[0]?.systemNo) || `SYS-${t.id}`,
        playersCount: Array.isArray(t.players) ? t.players.length : 0,
        integrity: t.integrity,
        isEliminated: Boolean(t.is_eliminated),
        status: t.status || (t.is_eliminated ? 'ELIMINATED' : 'ACTIVE'),
        secretRevealed: t.secret_revealed,
        role: showSecret ? t.role : 'UNKNOWN',
        modules: t.modules,
        suspicion: t.suspicion,
        score: t.score,
        lastSeenAt: t.last_seen_at
      };
    });

    const { data: logs } = await supabase
      .from('game_logs')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(50);

    const { data: chat } = await supabase
      .from('game_chat')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(100);

    const timing = this.calculateElapsedTiming(session);
    const leaderboard = await this.getLeaderboard(sessionId, { activeOnly: true });

    // Determine accurate completed stages for player's squad
    let myCompletedStages = (myTeam?.completed_stages !== undefined && myTeam?.completed_stages !== null)
      ? myTeam.completed_stages
      : (myTeam?.completed_levels || 0);

    if (teamId) {
      try {
        const { data: progRecords } = await supabase
          .from('team_progress')
          .select('level_id, status')
          .eq('session_id', sessionId)
          .eq('team_id', teamId);
        if (Array.isArray(progRecords)) {
          const completedFromProg = progRecords
            .filter(p => p.status === 'COMPLETED')
            .map(p => Number(p.level_id))
            .filter(n => !isNaN(n));
          if (completedFromProg.length > 0) {
            myCompletedStages = Math.max(myCompletedStages, ...completedFromProg);
          }
        }
      } catch (_) {}
    }

    return {
      sessionId: session.id,
      status: session.status,
      phase: session.current_phase,
      round: session.current_round,
      maxRounds: session.max_rounds,
      timer: session.phase_timer_seconds,
      isPaused: session.is_paused,
      timing,
      myTeam: myTeam ? {
        ...myTeam,
        visibleEvidence: this.evidenceManager.getVisibleEvidenceForTeam(teamId, isAdmin)
      } : null,
      teams: sanitizedTeams,
      leaderboard,
      systemLogs: (logs || []).map(l => ({
        id: l.id,
        timestamp: new Date(l.created_at).toTimeString().split(' ')[0],
        type: l.log_type,
        source: l.source,
        message: l.message
      })),
      chatMessages: chat || [],
      activeAccusation: session.active_accusation,
      defenseStatement: session.defense_statement,
      revealResult: session.reveal_result,
      scoringRules: session.scoring_rules,
      challenges: generateCivilianLabChallenges(),
      currentStage: Math.min(myCompletedStages + 1, 5),
      completedStages: Array.from({ length: myCompletedStages }, (_, i) => i + 1),
      unlockedEvidenceBatches: Array.from({ length: Math.min(myCompletedStages + 1, 6) }, (_, i) => i + 1)
    };
  }
}

module.exports = new GameService();
