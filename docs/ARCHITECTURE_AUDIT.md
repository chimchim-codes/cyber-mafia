# CYBER MAFIA — Architecture Audit & Serverless Migration Plan

## 1. Executive Summary
This audit reviews the architecture, authoritative state management, transport layers, security posture, and lifecycle handling of **CYBER MAFIA** (https://github.com/chimchim-codes/cyber-mafia). The objective is to migrate the game from an ephemeral, single-process Express + Socket.IO server to an authoritative, resilient serverless architecture hosted exclusively on **Vercel** (Serverless API Functions & static frontend hosting) and **Supabase** (PostgreSQL durable storage & Supabase Realtime pub/sub), adding persistent multiplayer progress, a live session-scoped leaderboard, precise pause/resume session timing, administrative recovery snapshots, and CSV export capabilities.

---

## 2. Component-by-Component Audit

### 2.1 Frontend Framework & Routing
- **Framework**: React 18.3.1 bundled with Vite 5.4.10 and TailwindCSS 4.3.3.
- **Routing**: Single-page application (SPA) state machine in `client/src/App.jsx`. Game phases determine views (`LOBBY`, `ROLE_ASSIGNMENT`, `HACKER_PHASE`, `CIVILIAN_PHASE`, `DEFENCE_PHASE`, `REVEAL_PHASE`, `GAME_OVER`).
- **Icons & UI**: `lucide-react`, `canvas-confetti`, custom sound effects engine using Web Audio API synthesis (`client/src/utils/soundEffects.js`).
- **Current Connection Model**: Hard-coded connection to `window.location.origin` via `socket.io-client` with WebSocket and polling transports.
- **Migration Impact**: Maintain React + Vite. Provide client-side Supabase client for safe Realtime channel subscriptions (`postgres_changes` / broadcast) and replace socket emissions with standard REST calls to Vercel Serverless Functions (`/api/*`).

### 2.2 Package Manifests & Dependencies
- **Root `package.json`**:
  - `cors`: `^2.8.6`
  - `dotenv`: `^18.0.5`
  - `express`: `^5.2.1`
  - `socket.io`: `^4.8.4`
  - `uuid`: `^14.0.2`
  - Scripts: `"start": "node server/server.js"`, `"build": "npm --prefix client run build"`
- **Client `client/package.json`**:
  - React, React DOM, Tailwind CSS v4, Lucide React, Socket.IO client.
- **Missing Dependencies**:
  - `@supabase/supabase-js` is required in both the root workspace (for serverless Vercel Functions with `service_role` authorization) and client (for public anon access and Realtime subscriptions).

### 2.3 Backend & API Structure
- **Current Implementation**: `server/server.js` starts an Express 5 server on port 3001, instantiates a single global `gameEngine = new GameEngine()`, and serves two HTTP endpoints:
  - `GET /api/health`: Basic status check.
  - `GET /api/state`: Unauthenticated global state dump.
  - SPA fallback route serving `client/dist/index.html`.
- **Migration Impact**: Eliminate the persistent Node.js/Express server process for deployment. Create Vercel-compatible serverless functions under `api/`:
  - `api/health.js`
  - `api/session.js` (create, get, list sessions)
  - `api/game-action.js` (authoritative game operations: start, pause, resume, end, attack, solve, accuse, vote)
  - `api/leaderboard.js` (persisted leaderboard query)
  - `api/admin/recovery.js` (snapshots, resets, audits)
  - `api/admin/export-csv.js` (secure CSV download with formula injection protection)

### 2.4 Socket.IO Implementation & Event Handlers
- **Socket Handlers (`server/sockets/gameHandlers.js`)**:
  - Listens to 12 socket events: `join_lobby`, `start_game`, `request_attack_challenge`, `submit_attack_solution`, `use_deception_ability`, `solve_civilian_challenge`, `submit_accusation`, `submit_defense_statement`, `cast_jury_vote`, `send_chat_message`, `admin_action`, `disconnect`.
  - Broadcasts on `game_state_update`, `timer_tick`, `chat_message`, `joined_team_success`, `attack_challenge_ready`, `attack_result`, `deception_result`, `ctf_lab_result`, `vote_recorded`, `action_error`.
- **Serverless Replacement**:
  - Mutations are performed via authenticated/session-bound HTTP POST requests to `/api/game-action` or dedicated sub-endpoints.
  - Live broadcast and state sync are managed via Supabase Realtime channels scoped per `session_id`.
  - Sensitive information (e.g. secret roles of other teams, hidden attacker identities) is masked server-side prior to broadcast, or delivered via scoped channels.

### 2.5 Game Engine & Authoritative State
- **Current Implementation (`server/game/GameEngine.js`)**:
  - Subclasses `EventEmitter`.
  - Stores all state in memory: `this.teams`, `this.phase`, `this.round`, `this.timer`, `this.isPaused`, `this.activeAttackChallenges`, `this.civilianLabChallenges`, `this.systemLogs`, `this.chatMessages`, `this.activeAccusation`, `this.activeSpoofs`, `this.scoringRules`.
  - Runs a 1-second `setInterval` (`startTimer`) to decrement `this.timer` and invoke `advancePhase()` when the timer reaches 0.
  - Runs a 7-second `setInterval` in `botAI.js` to simulate bot interactions.
- **State Machine Phases**:
  1. `LOBBY`: Team roster selection.
  2. `ROLE_ASSIGNMENT`: Roles assigned (HACKER vs CIVILIAN), 10s countdown.
  3. `HACKER_PHASE`: 90s countdown, hacker exploit challenges.
  4. `CIVILIAN_PHASE`: 150s countdown, forensic CTF labs, log/packet investigation.
  5. `DEFENCE_PHASE`: 45s countdown when an indictment is filed. Accused presents defense; jury votes.
  6. `REVEAL_PHASE`: 15s countdown, verdict evaluated, score delta applied, suspect unmasked or acquitted.
  7. `GAME_OVER`: Final tally, victory conditions checked.
- **Migration Impact**:
  - Refactor game engine domain logic into modular, stateless/rehydratable services that read and write directly to Supabase PostgreSQL.
  - Replace in-memory `setInterval` with deterministic timestamp mathematics based on `started_at`, `phase_start_time`, `phase_duration`, and `accumulated_paused_seconds`.
  - Persist all challenge instances, submissions, logs, chat, and tribunal events into database tables.

### 2.6 Team & Lobby Management
- **Current Implementation**: Generates 8 default teams (C01 to C08) with names like "Ghost Protocol", "Cyber Sentinel", etc. Supports up to 15 squads. Teams have 100% integrity, 0 score, active subsystems (`dashboard`, `investigation`, `evidenceVault`, `networkMonitor`).
- **Migration Impact**: Store teams in `teams` table linked to `game_sessions`. Support dynamic player roster registration and team state recovery upon reconnection.

### 2.7 Challenge & Level Progression
- **Hacker Challenges (`server/game/challenges.js`)**:
  - `COOKIE_SHIFT`: Base64 decode, modify privilege level (`access=0` to `access=3`), re-encode.
  - `TOKEN_HUNT`: Endpoint traversal to extract two token fragments.
  - `ROUTE_BREAK`: Traversal to construct unauthenticated diagnostic URL.
  - `PACKET_DECODE`: Hexadecimal byte string to ASCII decoding.
- **Civilian CTF Labs**:
  - 6 categories: `BASE64`, `HEX`, `HASH_ID`, `LOGIC`, `PATTERN`, `STEGO`.
- **Migration Impact**: Retain exact challenge generation and validation algorithms. Store active and completed challenges in database tables (`team_progress` and `score_events`) with idempotency keys to prevent duplicate points.

### 2.8 Scoring & Leaderboard Logic
- **Current Scoring Table**:
  - `COMPROMISE_SUCCESS`: +100
  - `SOLVE_INVESTIGATION_CTF`: +75
  - `CORRECT_HACKER_ACCUSATION`: +300
  - `SURVIVE_ROUND`: +50
  - `FALSE_ACCUSATION_PENALTY`: -100
  - `FAILED_ATTACK_PENALTY`: -25
  - `SUCCESSFUL_DECEPTION`: +100
- **Leaderboard Status**: Currently, scores exist only as numbers on in-memory team objects (`t.score`). There is no dedicated leaderboard view, no ranking tie-breaker logic, no historical persistence, and no CSV export.
- **Migration Impact**: Build an authoritative `score_events` ledger and projected `teams.score`. Implement a real-time, deterministic, tie-breaking leaderboard in the UI with loading, reconnecting, and error states.

### 2.9 Admin Authentication & Permissions
- **Current Implementation**: The client simply sends `isAdmin: true` during `join_lobby`. The server sets `socket.data.isAdmin = true` with zero authentication, passwords, or tokens. Any client can access god-mode controls.
- **Migration Impact**: Implement secure server-side authorization using an admin secret (`ADMIN_SECRET_KEY`) stored strictly as a Vercel server environment variable. Require this secret/token in administrative API requests. Disallow unauthenticated clients from invoking admin actions or reading unmasked secret roles.

### 2.10 Persistence Mechanisms
- **Current Implementation**: None. 100% in-process memory. Any restart or serverless invocation wipes all state.
- **Migration Impact**: Full PostgreSQL relational schema via Supabase migrations, implementing tables for `game_sessions`, `teams`, `team_progress`, `score_events`, `recovery_snapshots`, `admin_audit_logs`, `game_evidence`, and `game_logs`.

### 2.11 Deployment Configuration
- **Current Implementation**: Single Node script `node server/server.js`.
- **Migration Impact**: Add `vercel.json` with build commands, route rewrites, and `/api` function definitions. Configure environment variables for Supabase and admin access.

### 2.12 Tests & Documentation
- **Current Implementation**: 0 test files in the repository. README covers game narrative and simulated CTF rules.
- **Migration Impact**: Implement automated tests covering leaderboard rankings, lifecycle transitions, progress checkpoints, recovery snapshots, score reconciliation, CSV exports, formula injection protection, and regression tests.

---

## 3. Persistent Process Dependencies & Severance Strategy

| Ephemeral Component | Persistent Server Process Dependency | Severance / Migration Strategy |
| :--- | :--- | :--- |
| **Phase Timer** | `setInterval(..., 1000)` running in Node process | Timestamps in UTC (`phase_start_time`, `phase_duration`, `pause_started_at`, `accumulated_paused_seconds`). Clients compute remaining time; server verifies deadline expiration on action submission. |
| **Bot AI** | `setInterval(..., 7000)` simulating bots | Bot ticks executed on demand during phase transitions or via scheduled trigger / admin simulation invocation. |
| **Game State** | Stored in memory on `GameEngine` instance | Normalized PostgreSQL database in Supabase with ACID transactions and row-level security. |
| **Realtime Pub/Sub** | In-memory `socket.io` server | Supabase Realtime postgres_changes and broadcast channels scoped to `session_id`. |
| **Admin Controls** | In-memory socket event `admin_action` | Authenticated Vercel API endpoint (`/api/admin/*`) checking `x-admin-key`. |
| **Evidence Vault** | In-memory `EvidenceManager.evidenceList` | Persisted in `game_evidence` table with role-sanitized RLS / API views. |
| **Chat & System Logs** | In-memory arrays `systemLogs` and `chatMessages` | Persisted in `game_logs` and `game_chat` tables with realtime distribution. |

---

## 4. Implementation Checklist

- [ ] **Phase 0 — Audit & Documentation**:
  - [x] Complete architectural inspection of frontend, backend, sockets, game engine, and state.
  - [x] Write `docs/ARCHITECTURE_AUDIT.md`.
- [ ] **Phase 1 — Vercel + Supabase Serverless Architecture**:
  - [ ] Add `@supabase/supabase-js` dependencies to project.
  - [ ] Configure `vercel.json` for React + Vite static output and serverless `/api` routing.
  - [ ] Create root `.env.example` with clear placeholders.
  - [ ] Configure Supabase client helpers (client-side anon key, server-side service role key).
- [ ] **Phase 2 — Database Schema & Migrations**:
  - [ ] Write SQL migrations (`supabase/migrations/001_initial_schema.sql`):
    - [ ] `game_sessions`: IDs, status, lifecycle timestamps, phase timing, pause accumulation.
    - [ ] `teams`: IDs, session foreign keys, names, projected scores, integrity, secret roles, status.
    - [ ] `team_progress`: session, team, level/round, status, validated challenges JSON, score contribution, revision.
    - [ ] `score_events`: audit ledger with signed deltas, event types, unique idempotency keys.
    - [ ] `recovery_snapshots`: team progress snapshots, revisions, score metadata, recovery reasons.
    - [ ] `admin_audit_logs`: admin identity, action type, previous/resulting states, reasons.
    - [ ] `game_evidence` & `game_logs`: forensic data and audit trail.
  - [ ] Add indexes, constraints, and RLS policies.
- [ ] **Phase 3 — Real-Time Leaderboard**:
  - [ ] Build server-side leaderboard calculation function/endpoint with deterministic tie-breaking (score DESC, completion time ASC, team ID ASC).
  - [ ] Create integrated React leaderboard component in UI.
  - [ ] Wire Supabase Realtime updates on `score_events` / `teams`.
  - [ ] Support loading, error, reconnecting, and completed-game states.
- [ ] **Phase 4 — Authoritative Lifecycle (Start, Pause, Resume, End)**:
  - [ ] Server-side start endpoint with timestamp generation and duplicate start prevention.
  - [ ] Server-side pause endpoint: record `pause_started_at`, transition status, freeze gameplay.
  - [ ] Server-side resume endpoint: calculate paused interval, add to `accumulated_paused_seconds`, reset pause timer.
  - [ ] Server-side end endpoint: record `ended_at`, mark COMPLETED.
  - [ ] Authoritative elapsed duration calculator (wall clock minus accumulated and active pause intervals).
  - [ ] UI indicators for PAUSED status across all client views.
- [ ] **Phase 5 — Automatic Progress Persistence**:
  - [ ] Auto-checkpointing after validated challenge completion, answer submission, level completion.
  - [ ] Reconnection handler: load authoritative progress and reconcile with current session.
  - [ ] Idempotency protection against duplicate submissions.
- [ ] **Phase 6 — Administrative Recovery Snapshots**:
  - [ ] Automatic snapshot creation on meaningful transitions.
  - [ ] Admin UI for inspecting recovery history by team and level.
  - [ ] Snapshot preview and atomic restore operation with score reconciliation.
  - [ ] Administrative reset operations (single level, current level, entire progress, score recalculation).
  - [ ] Complete administrative audit logging for every restore and reset.
- [ ] **Phase 7 — Secure CSV Export**:
  - [ ] Administrative Export Final Results endpoint (`/api/admin/export-csv`).
  - [ ] Required columns: Rank, Team ID, Team Name, Final Score, Completion Status, Levels Completed, Start Time, End Time, Wall-clock Duration, Paused Duration, Active Gameplay Duration.
  - [ ] Prevent formula injection (sanitize `=`, `+`, `-`, `@`, `\t`, `\r`).
  - [ ] Handle Unicode names and quote escaping.
  - [ ] Restrict access to authenticated admins and handle provisional runs.
- [ ] **Phase 8 — Security & Authorization**:
  - [ ] Protect serverless endpoints with admin authorization headers.
  - [ ] Ensure Supabase `service_role` key is never exposed to client.
  - [ ] Sanitize public game state to prevent leaking secret hacker roles or spoof origins.
- [ ] **Phase 9 — Automated Testing Suite**:
  - [ ] Leaderboard tests (initial query, rankings, tie resolution, session isolation).
  - [ ] Lifecycle tests (start, duplicate start, pause, resume, multiple pauses, end, elapsed calculation).
  - [ ] Progress persistence tests (checkpoints, duplicate submissions, reconnection).
  - [ ] Recovery snapshot tests (creation, isolation, restoration, score reconciliation, unauthorized denial).
  - [ ] CSV export tests (columns, formula injection prevention, Unicode handling, provisional labeling).
  - [ ] Gameplay regression tests (challenge validation, evidence generation, tribunal verdicts).
- [ ] **Phase 10 — Vercel & Supabase Deployment Setup**:
  - [ ] Configure `vercel.json`.
  - [ ] Prepare migration runners and SQL instructions.
  - [ ] Document free-tier limits, connection budgeting, and environment variables.
- [ ] **Phase 11 — Comprehensive Documentation**:
  - [ ] `docs/PERSISTENCE_AND_LEADERBOARD.md`
  - [ ] `docs/DATABASE_SETUP.md`
  - [ ] `docs/ADMIN_RECOVERY.md`
  - [ ] `docs/DEPLOYMENT.md`
  - [ ] Update `README.md`.
