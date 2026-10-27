-- =========================================================================
-- CYBER MAFIA: Supabase PostgreSQL Schema & Realtime Setup
-- Phase 2 Durable Entities, Constraints, Triggers, and RLS Policies
-- =========================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. GAME SESSIONS
CREATE TABLE IF NOT EXISTS game_sessions (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'NOT_STARTED' CHECK (status IN ('NOT_STARTED', 'RUNNING', 'PAUSED', 'COMPLETED')),
  current_phase TEXT NOT NULL DEFAULT 'LOBBY' CHECK (current_phase IN ('LOBBY', 'ROLE_ASSIGNMENT', 'HACKER_PHASE', 'CIVILIAN_PHASE', 'DEFENCE_PHASE', 'REVEAL_PHASE', 'GAME_OVER')),
  current_round INTEGER NOT NULL DEFAULT 1 CHECK (current_round >= 1),
  max_rounds INTEGER NOT NULL DEFAULT 5 CHECK (max_rounds >= 1),
  phase_timer_seconds INTEGER NOT NULL DEFAULT 120,
  phase_duration_seconds INTEGER NOT NULL DEFAULT 120,
  phase_started_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  is_paused BOOLEAN NOT NULL DEFAULT FALSE,
  pause_started_at TIMESTAMPTZ,
  accumulated_paused_seconds INTEGER NOT NULL DEFAULT 0 CHECK (accumulated_paused_seconds >= 0),
  last_meaningful_update TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  scoring_rules JSONB NOT NULL DEFAULT '{
    "COMPROMISE_SUCCESS": 100,
    "SOLVE_INVESTIGATION_CTF": 75,
    "CORRECT_HACKER_ACCUSATION": 300,
    "SURVIVE_ROUND": 50,
    "FALSE_ACCUSATION_PENALTY": -100,
    "FAILED_ATTACK_PENALTY": -25,
    "SUCCESSFUL_DECEPTION": 100
  }'::jsonb,
  active_accusation JSONB,
  defense_statement TEXT,
  jury_votes JSONB NOT NULL DEFAULT '{}'::jsonb,
  reveal_result JSONB,
  active_spoofs JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- Index for session status
CREATE INDEX IF NOT EXISTS idx_game_sessions_status ON game_sessions(status);

-- 2. TEAMS
CREATE TABLE IF NOT EXISTS teams (
  id TEXT NOT NULL,
  session_id TEXT NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'CIVILIAN' CHECK (role IN ('CIVILIAN', 'HACKER')),
  secret_revealed BOOLEAN NOT NULL DEFAULT FALSE,
  integrity INTEGER NOT NULL DEFAULT 100 CHECK (integrity >= 0 AND integrity <= 100),
  score INTEGER NOT NULL DEFAULT 0,
  is_bot BOOLEAN NOT NULL DEFAULT TRUE,
  is_eliminated BOOLEAN NOT NULL DEFAULT FALSE,
  modules JSONB NOT NULL DEFAULT '{
    "dashboard": "ACTIVE",
    "investigation": "ACTIVE",
    "evidenceVault": "ACTIVE",
    "networkMonitor": "ACTIVE"
  }'::jsonb,
  players JSONB NOT NULL DEFAULT '[]'::jsonb,
  attack_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  evidence_count INTEGER NOT NULL DEFAULT 0,
  suspicion TEXT NOT NULL DEFAULT 'LOW',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  PRIMARY KEY (session_id, id)
);

CREATE INDEX IF NOT EXISTS idx_teams_session_score ON teams(session_id, score DESC, updated_at ASC);

-- 3. TEAM LEVEL PROGRESS
CREATE TABLE IF NOT EXISTS team_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT NOT NULL,
  team_id TEXT NOT NULL,
  level_id INTEGER NOT NULL CHECK (level_id >= 1),
  status TEXT NOT NULL DEFAULT 'IN_PROGRESS' CHECK (status IN ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'RESET')),
  validated_challenges JSONB NOT NULL DEFAULT '[]'::jsonb,
  progress_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  score_contribution INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  completed_at TIMESTAMPTZ,
  last_checkpoint_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision >= 1),
  CONSTRAINT fk_team FOREIGN KEY (session_id, team_id) REFERENCES teams(session_id, id) ON DELETE CASCADE,
  CONSTRAINT uq_team_level UNIQUE (session_id, team_id, level_id)
);

CREATE INDEX IF NOT EXISTS idx_team_progress_lookup ON team_progress(session_id, team_id, level_id);

-- 4. SCORE EVENTS (Authoritative Ledger)
CREATE TABLE IF NOT EXISTS score_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  team_id TEXT NOT NULL,
  level_id INTEGER NOT NULL DEFAULT 1,
  event_type TEXT NOT NULL,
  score_delta INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  idempotency_key TEXT NOT NULL UNIQUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT fk_score_team FOREIGN KEY (session_id, team_id) REFERENCES teams(session_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_score_events_session_team ON score_events(session_id, team_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_score_events_idempotency ON score_events(idempotency_key);

-- 5. RECOVERY SNAPSHOTS
CREATE TABLE IF NOT EXISTS recovery_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT NOT NULL,
  team_id TEXT NOT NULL,
  level_id INTEGER NOT NULL,
  revision INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  progress_state JSONB NOT NULL,
  validated_challenges JSONB NOT NULL DEFAULT '[]'::jsonb,
  score_at_snapshot INTEGER NOT NULL DEFAULT 0,
  score_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  reason TEXT NOT NULL,
  CONSTRAINT fk_snapshot_team FOREIGN KEY (session_id, team_id) REFERENCES teams(session_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_recovery_snapshots_lookup ON recovery_snapshots(session_id, team_id, level_id, created_at DESC);

-- 6. ADMINISTRATIVE AUDIT LOG
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  admin_identity TEXT NOT NULL,
  action_type TEXT NOT NULL,
  target_team_id TEXT,
  target_level_id INTEGER,
  previous_state JSONB,
  resulting_state JSONB,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_session ON admin_audit_logs(session_id, created_at DESC);

-- 7. GAME EVIDENCE
CREATE TABLE IF NOT EXISTS game_evidence (
  id TEXT NOT NULL,
  session_id TEXT NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  target_team_id TEXT NOT NULL,
  attacker_team_id TEXT NOT NULL,
  reported_origin_node TEXT NOT NULL,
  real_origin_node TEXT NOT NULL,
  attack_type TEXT NOT NULL,
  attack_signature TEXT NOT NULL,
  route TEXT NOT NULL,
  module_affected TEXT NOT NULL,
  packet_signature TEXT NOT NULL,
  base_confidence INTEGER NOT NULL DEFAULT 75,
  is_spoofed BOOLEAN NOT NULL DEFAULT FALSE,
  unlocked_by JSONB NOT NULL DEFAULT '[]'::jsonb,
  clues_found JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_erased BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  PRIMARY KEY (session_id, id)
);

CREATE INDEX IF NOT EXISTS idx_game_evidence_session ON game_evidence(session_id, is_erased);

-- 8. GAME LOGS
CREATE TABLE IF NOT EXISTS game_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  log_type TEXT NOT NULL,
  source TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_game_logs_session ON game_logs(session_id, created_at DESC);

-- 9. GAME CHAT
CREATE TABLE IF NOT EXISTS game_chat (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  sender_team_id TEXT NOT NULL,
  sender_team_name TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'PUBLIC',
  text TEXT NOT NULL,
  evidence_attachment JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_game_chat_session ON game_chat(session_id, created_at ASC);

-- =========================================================================
-- DATABASE FUNCTIONS & STORED PROCEDURES
-- =========================================================================

-- Recalculate team score from authoritative score_events ledger
CREATE OR REPLACE FUNCTION recalculate_team_score(p_session_id TEXT, p_team_id TEXT)
RETURNS INTEGER AS $$
DECLARE
  v_total INTEGER;
BEGIN
  SELECT COALESCE(SUM(score_delta), 0)
  INTO v_total
  FROM score_events
  WHERE session_id = p_session_id AND team_id = p_team_id;

  UPDATE teams
  SET score = v_total, updated_at = timezone('utc', now())
  WHERE session_id = p_session_id AND id = p_team_id;

  RETURN v_total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically update teams.score on score_events INSERT
CREATE OR REPLACE FUNCTION trg_sync_team_score()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM recalculate_team_score(NEW.session_id, NEW.team_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS after_score_event_insert ON score_events;
CREATE TRIGGER after_score_event_insert
AFTER INSERT ON score_events
FOR EACH ROW
EXECUTE FUNCTION trg_sync_team_score();

-- =========================================================================
-- REPLICA IDENTITY (Ensures Realtime broadcasts include full record data)
-- =========================================================================

ALTER TABLE game_sessions REPLICA IDENTITY FULL;
ALTER TABLE teams REPLICA IDENTITY FULL;
ALTER TABLE score_events REPLICA IDENTITY FULL;

-- =========================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES & PRIVILEGE HARDENING
-- =========================================================================

ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE score_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE recovery_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_chat ENABLE ROW LEVEL SECURITY;

-- 1. Game Sessions (Public Read for active gameplay state)
DROP POLICY IF EXISTS "Public read game_sessions" ON game_sessions;
CREATE POLICY "Public read game_sessions" ON game_sessions FOR SELECT TO anon, authenticated USING (true);

-- 2. Teams (Public Read for team names, scores, and integrity)
-- Note: Sensitive secret roles are shielded at the column level below
DROP POLICY IF EXISTS "Public read teams" ON teams;
CREATE POLICY "Public read teams" ON teams FOR SELECT TO anon, authenticated USING (true);

-- 3. Team Progress & Score Events (Authoritative public ledgers)
DROP POLICY IF EXISTS "Public read team_progress" ON team_progress;
CREATE POLICY "Public read team_progress" ON team_progress FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public read score_events" ON score_events;
CREATE POLICY "Public read score_events" ON score_events FOR SELECT TO anon, authenticated USING (true);

-- 4. Game Logs & Chat (Public Read)
DROP POLICY IF EXISTS "Public read game_logs" ON game_logs;
CREATE POLICY "Public read game_logs" ON game_logs FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public read game_chat" ON game_chat;
CREATE POLICY "Public read game_chat" ON game_chat FOR SELECT TO anon, authenticated USING (true);

-- 5. Game Evidence: RESTRICTED
-- Game evidence contains raw attacker identities and unmasked origin nodes.
-- Direct client access is denied; evidence is scrubbed and served authoritatively via /api/session.
DROP POLICY IF EXISTS "Public read non_erased evidence" ON game_evidence;
DROP POLICY IF EXISTS "Public read evidence" ON game_evidence;
REVOKE ALL ON game_evidence FROM anon, authenticated;

-- 6. Administrative Snapshots & Audit Logs: RESTRICTED
-- Must NOT be readable or writable by anon or authenticated users.
-- Only the service_role (which bypasses RLS) can access these tables.
DROP POLICY IF EXISTS "Service role full access recovery_snapshots" ON recovery_snapshots;
DROP POLICY IF EXISTS "Service role full access admin_audit_logs" ON admin_audit_logs;
REVOKE ALL ON recovery_snapshots FROM anon, authenticated;
REVOKE ALL ON admin_audit_logs FROM anon, authenticated;

-- 7. Shield sensitive role data on teams table from unauthorized public SELECTs:
-- Revoke wildcard SELECT on teams from anon and authenticated, and grant only non-sensitive columns.
-- Secret roles are delivered exclusively through /api/session with authoritative player role masking.
REVOKE SELECT ON teams FROM anon, authenticated;
GRANT SELECT (
  id, session_id, name, integrity, score, is_bot, is_eliminated,
  modules, players, attack_history, evidence_count, suspicion,
  created_at, updated_at
) ON teams TO anon, authenticated;

-- =========================================================================
-- REALTIME PUBLICATION CONFIGURATION (Idempotent)
-- =========================================================================

DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY['game_sessions', 'teams', 'score_events', 'game_logs', 'game_chat', 'team_progress'];
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;

  FOREACH tbl IN ARRAY tables LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_rel pr
      JOIN pg_publication p ON p.oid = pr.prpubid
      JOIN pg_class c ON c.oid = pr.prrelid
      WHERE p.pubname = 'supabase_realtime' AND c.relname = tbl
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', tbl);
    END IF;
  END LOOP;
END $$;
