# CYBER MAFIA — Supabase PostgreSQL Database Setup Guide

## 1. Prerequisites
- A free-tier Supabase account (https://supabase.com).
- A newly created Supabase Project (e.g. `cyber-mafia-prod`).
- Project Settings:
  - `SUPABASE_URL`: e.g. `https://your-ref.supabase.co`
  - `anon` Public API Key
  - `service_role` Secret API Key

---

## 2. Running Schema Migrations

### Option A: Via Supabase SQL Editor (Recommended for Fast Setup)
1. In the Supabase Dashboard, navigate to the **SQL Editor** tab.
2. Open the file [`supabase/migrations/001_initial_schema.sql`](../supabase/migrations/001_initial_schema.sql).
3. Copy the entire contents and paste them into the SQL Editor.
4. Click **Run**.
5. Verify that all 9 tables are created in the **Table Editor**:
   - `game_sessions`
   - `teams`
   - `team_progress`
   - `score_events`
   - `recovery_snapshots`
   - `admin_audit_logs`
   - `game_evidence`
   - `game_logs`
   - `game_chat`

### Option B: Via Supabase CLI
```bash
# Login to Supabase
npx supabase login

# Link your local project to your remote project
npx supabase link --project-ref your-project-ref

# Push database schema migrations
npx supabase db push
```

---

## 3. Row Level Security (RLS) & Policies

All tables have RLS enabled. The security model balances public read convenience with strict serverless write authorization:

| Table | Public Anon Read Policy | Privileged Service Role |
| :--- | :--- | :--- |
| `game_sessions` | Read all active matches | Full read/write |
| `teams` | Read squads (scores, integrity, status) | Full read/write (assigns & reveals roles) |
| `team_progress` | Read squad progress records | Full read/write |
| `score_events` | Read public score ledger | Full insert/update |
| `recovery_snapshots` | **RESTRICTED** (Admin only) | Full read/write |
| `admin_audit_logs` | **RESTRICTED** (Admin only) | Full read/write |
| `game_evidence` | Read non-erased incidents (`is_erased = false`) | Full read/write |
| `game_logs` | Read system activity feed | Full insert |
| `game_chat` | Read public and team comms | Full insert |

---

## 4. Supabase Realtime Configuration

The migration automatically creates and attaches tables to the `supabase_realtime` publication:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE game_sessions, teams, score_events, game_logs, game_chat, team_progress;
```
To verify in Supabase Studio:
1. Navigate to **Database** ➔ **Replication**.
2. Confirm that `supabase_realtime` has `game_sessions`, `teams`, `score_events`, `game_logs`, `game_chat`, and `team_progress` toggled **ON**.

---

## 5. Stored Procedures & Database Triggers

### 5.1 `recalculate_team_score(p_session_id TEXT, p_team_id TEXT)`
Calculates the exact sum of all signed score deltas from `score_events` for a team and updates `teams.score` atomically.

### 5.2 `trg_sync_team_score()` Trigger
Automatically fires `AFTER INSERT ON score_events` to keep projected squad scores synchronized without relying on client calculations.

---

## 6. Testing the Database Connection

To verify that the database credentials and tables are operational:
```bash
# Set environment variables
export SUPABASE_URL="https://your-project-id.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Run tests
npm test
```
All 37 automated tests will validate schema operations, idempotent inserts, and snapshot recovery.
