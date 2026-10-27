# CYBER MAFIA — Persistent Game State & Live Leaderboard Architecture

## 1. Overview
CYBER MAFIA utilizes **Supabase PostgreSQL** as the durable source of truth and **Supabase Realtime** for instant pub/sub state synchronization across all connected squads, spectators, and administrators. 

Unlike traditional ephemeral single-process Node.js servers, every critical game event (session lifecycle changes, team joins, attack compromise, forensic CTF solves, tribunal verdicts, and recovery operations) is committed transactionally to PostgreSQL before state changes are broadcast.

---

## 2. Persistent Entity Architecture

```text
┌─────────────────┐       1:N       ┌──────────────┐       1:N       ┌────────────────────┐
│  game_sessions  ├────────────────►│    teams     ├────────────────►│   team_progress    │
└────────┬────────┘                 └──────┬───────┘                 └─────────┬──────────┘
         │                                 │                                   │
         │ 1:N                             │ 1:N                               │ 1:N
         ▼                                 ▼                                   ▼
┌─────────────────┐                 ┌──────────────┐                 ┌────────────────────┐
│   game_logs /   │                 │ score_events │                 │ recovery_snapshots │
│    game_chat    │                 │   (Ledger)   │                 │    (Snapshots)     │
└─────────────────┘                 └──────────────┘                 └────────────────────┘
```

### 2.1 Game Sessions (`game_sessions`)
- **Primary Key**: `id` (string, e.g. `default-cyber-session` or custom room code).
- **Lifecycle Statuses**: `NOT_STARTED` ➔ `RUNNING` ➔ `PAUSED` ➔ `COMPLETED`.
- **Game Phases**: `LOBBY`, `ROLE_ASSIGNMENT`, `HACKER_PHASE`, `CIVILIAN_PHASE`, `DEFENCE_PHASE`, `REVEAL_PHASE`, `GAME_OVER`.
- **Durable Timing**:
  - `started_at` / `ended_at`: Authoritative UTC timestamps.
  - `is_paused`: Boolean flag enforced on all server operations.
  - `pause_started_at`: UTC timestamp of current active pause interval.
  - `accumulated_paused_seconds`: Sum of all completed pause intervals.
  - `phase_timer_seconds` & `phase_duration_seconds`: Phase clock baseline.

### 2.2 Teams (`teams`)
- **Composite Key**: `(session_id, id)`.
- **Roster**: `players` JSONB array of connected client call-signs and IDs.
- **Attributes**: `integrity` (0–100%), `score` (projected score), `is_eliminated`, `modules` status.
- **Secret Role**: `role` (`HACKER` vs `CIVILIAN`), masked by server APIs until revealed or game over.

### 2.3 Authoritative Score Events (`score_events`)
Every score modification is written as an append-only event with:
- `session_id`, `team_id`, `level_id`.
- `event_type`: `COMPROMISE_SUCCESS`, `SOLVE_INVESTIGATION_CTF`, `CORRECT_HACKER_ACCUSATION`, `SURVIVE_ROUND`, `FALSE_ACCUSATION_PENALTY`, `FAILED_ATTACK_PENALTY`, `SUCCESSFUL_DECEPTION`, `ADMIN_RESTORE_ADJUSTMENT`, `ADMIN_FULL_RESET`.
- `score_delta`: Signed integer (+100, -25, +75, +300, -100).
- `idempotency_key`: Unique string constraint preventing accidental duplicate submissions from awarding points more than once.
- Auto-sync database trigger `after_score_event_insert` triggers `recalculate_team_score()` to keep `teams.score` synchronized.

---

## 3. Real-Time Leaderboard Mechanics (Phase 3)

### 3.1 Live Standings Calculation
The leaderboard is computed authoritatively by `gameService.getLeaderboard(sessionId)` and queried via `/api/leaderboard`:
1. **Primary Sort**: `score DESC`.
2. **Secondary Sort**: `completedLevels DESC` (number of completed levels).
3. **Tertiary Sort (Earliest Checkpoint)**: `last_checkpoint_at ASC` / `updated_at ASC` (rewards squads that reached the score first).
4. **Final Deterministic Tie-Breaker**: `teamId ASC` (e.g. `C01` before `C02`).

### 3.2 Displayed Attributes
- **Rank**: Dynamic rank `#1`, `#2`, etc., with gold/silver/bronze styling for top 3.
- **Squad Name & ID**: e.g., `Ghost Protocol (C01)`.
- **Authoritative Score**: Current score delta tally (+PTS).
- **Integrity**: Current system integrity percentage (0-100%).
- **Completion Status**: `ACTIVE`, `ELIMINATED`, or `COMPLETED`.
- **Levels Completed**: Count of stages solved.

### 3.3 Supabase Realtime Synchronization
The client component `LeaderboardView.jsx` subscribes to PostgreSQL change streams:
```javascript
const channel = supabase
  .channel(`cyber_mafia_${sessionId}`)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'score_events', filter: `session_id=eq.${sessionId}` }, refreshLeaderboard)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'teams', filter: `session_id=eq.${sessionId}` }, refreshLeaderboard)
  .subscribe();
```
- **Disconnection Handling**: Shows visual state badge (`CONNECTED`, `RECONNECTING`, `ERROR`).
- **Browser Refresh**: Fetches initial state from `/api/leaderboard` on mount; survives refreshes and serverless cold starts.
- **Session Isolation**: All queries and Realtime filters are strictly scoped to the active `sessionId`.

---

## 4. Authoritative Timing Calculations (Phase 4)

Timing is computed mathematically rather than trusting a local client ticker:
$$\text{WallClockSeconds} = \lfloor (\text{EndedAt or Now} - \text{StartedAt}) / 1000 \rfloor$$
$$\text{ActiveGameplaySeconds} = \text{WallClockSeconds} - \text{AccumulatedPausedSeconds} - \text{CurrentPauseInterval}$$

If a match is paused, all game operations via `/api/game-action` are strictly rejected by the server, and a global **MATCH PAUSED** warning is rendered across all clients.
