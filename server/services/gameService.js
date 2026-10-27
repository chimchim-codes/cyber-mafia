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

  async joinTeam(sessionId, playerName, teamId, socketOrClientId) {
    const supabase = getServiceClient();
    const session = await this.getOrCreateSession(sessionId);

    const { data: team } = await supabase
      .from('teams')
      .select('*')
      .eq('session_id', sessionId)
      .eq('id', teamId)
      .single();

    if (!team) {
      throw new Error(`Team ${teamId} not found in session ${sessionId}`);
    }

    const players = Array.isArray(team.players) ? [...team.players] : [];
    if (players.length >= 3) {
      throw new Error(`Team ${teamId} is full (max 3 players)`);
    }

    const newPlayer = {
      clientId: socketOrClientId || 'CLI_' + crypto.randomBytes(3).toString('hex'),
      name: playerName || `Agent_${crypto.randomBytes(2).toString('hex')}`,
      joinedAt: new Date().toISOString()
    };

    players.push(newPlayer);

    const { data: updatedTeam, error: updErr } = await supabase
      .from('teams')
      .update({
        players,
        is_bot: false,
        updated_at: new Date().toISOString()
      })
      .eq('session_id', sessionId)
      .eq('id', teamId)
      .single();

    if (updErr) {
      throw new Error(`Database error joining team: ${updErr.message}`);
    }

    return updatedTeam || { ...team, players, is_bot: false };
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

  async getLeaderboard(sessionId) {
    const supabase = getServiceClient();

    const { data: teams, error } = await supabase
      .from('teams')
      .select('id, name, score, integrity, is_eliminated, updated_at')
      .eq('session_id', sessionId);

    if (error || !teams) {
      return [];
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

    // Deterministic sorting:
    // 1. Score DESC
    // 2. Completed Levels DESC
    // 3. Earliest Checkpoint / Update ASC (tie-breaker for who reached it first)
    // 4. Team ID ASC (final deterministic tie-breaker)
    const sorted = [...teams].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;

      const aComp = progressMap[a.id]?.completedLevels || 0;
      const bComp = progressMap[b.id]?.completedLevels || 0;
      if (bComp !== aComp) return bComp - aComp;

      const aTime = progressMap[a.id]?.latestCheckpoint || a.updated_at || '';
      const bTime = progressMap[b.id]?.latestCheckpoint || b.updated_at || '';
      if (aTime !== bTime) return aTime.localeCompare(bTime);

      return a.id.localeCompare(b.id);
    });

    return sorted.map((t, idx) => ({
      rank: idx + 1,
      teamId: t.id,
      teamName: t.name,
      score: t.score,
      integrity: t.integrity,
      isEliminated: t.isEliminated,
      completionStatus: t.isEliminated ? 'ELIMINATED' : 'ACTIVE',
      completedLevels: progressMap[t.id]?.completedLevels || 0
    }));
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

    // Mask secret roles of other teams unless revealed or admin
    const sanitizedTeams = (allTeams || []).map(t => {
      const isSelf = t.id === teamId;
      const isHackerAlly = myRole === 'HACKER' && t.role === 'HACKER';
      const showSecret = isAdmin || t.secret_revealed || isSelf || isHackerAlly;

      return {
        id: t.id,
        name: t.name,
        playersCount: Array.isArray(t.players) ? t.players.length : 0,
        integrity: t.integrity,
        isEliminated: t.is_eliminated,
        secretRevealed: t.secret_revealed,
        role: showSecret ? t.role : 'UNKNOWN',
        modules: t.modules,
        suspicion: t.suspicion,
        score: t.score
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
    const leaderboard = await this.getLeaderboard(sessionId);

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
      scoringRules: session.scoring_rules
    };
  }
}

module.exports = new GameService();
