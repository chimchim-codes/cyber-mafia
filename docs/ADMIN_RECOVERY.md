# CYBER MAFIA — Administrative Recovery, Resets & CSV Export

## 1. Overview
The Administrative Recovery subsystem (Phase 6) provides tournament organizers, instructors, and game masters with authoritative tools to inspect, remediate, restore, and audit squad progress during live events without interrupting the entire game session.

All administrative actions require the `ADMIN_SECRET_KEY` (configured in Vercel environment variables) and are logged immutably to `admin_audit_logs`.

---

## 2. Checkpoint Snapshots Architecture

### 2.1 Automatic Checkpoint Triggering
Snapshots are captured automatically upon meaningful gameplay events:
- Successful Hacker Exploit compromise (+100 PTS).
- Civilian Forensic CTF Lab challenge solve (+75 PTS).
- Tribunal Indictment verdict resolution (+300 PTS / -100 PTS).
- Level progression or stage transitions.
- Manual administrator checkpoint request.

### 2.2 Snapshot Payload Schema (`recovery_snapshots`)
```json
{
  "id": "SNAP_3f8a912e",
  "session_id": "cyber-mafia-live",
  "team_id": "C01",
  "level_id": 1,
  "revision": 3,
  "created_at": "2026-10-27T00:15:20.000Z",
  "progress_state": {
    "level_id": 1,
    "status": "IN_PROGRESS",
    "validated_challenges": ["CHAL_COOKIE_01"],
    "score_contribution": 100
  },
  "score_at_snapshot": 100,
  "score_metadata": { "checkpointReason": "Score event: COMPROMISE_SUCCESS (+100)" },
  "reason": "Automatic progress persistence checkpoint"
}
```

---

## 3. Snapshot Inspection & Rollback (Phase 6.2 & 6.3)

In the Admin Console (**Admin** ➔ **Recovery Snapshots & Resets**):
1. **Target Squad & Level**: Select a squad (`C01` to `C15`) and stage (`Level 1` to `5`).
2. **History Inspection**: View all recorded checkpoints in reverse chronological order with revision number, capture timestamp, and score at capture.
3. **Pre-Restoration Safety Backup**: Before restoring, the server automatically captures a safety snapshot of the active state.
4. **Atomic Restoration**:
   - Replaces `team_progress` state for that specific team and level.
   - Reconciles scores: If the snapshot score differs from the team's current score, an `ADMIN_RESTORE_ADJUSTMENT` score event is inserted into `score_events`, and the projected score is recalculated.
   - Increments progress revision.
   - Emits Realtime updates to connected clients.
   - Records administrative audit entry with previous and resulting states.

---

## 4. Administrative Reset Operations (Phase 6.4)

| Reset Action | Scope | Description |
| :--- | :--- | :--- |
| **Reset Team Level** | Single squad, single level | Resets validated challenges and progress state for that level without modifying scores on other levels or affecting other teams. |
| **Reset Entire Squad** | Single squad, all levels | Resets all levels for that squad, resets integrity to 100%, and inserts a compensating entry to zero the squad's score. |
| **Recalculate Score** | Single squad | Sums all signed score deltas from `score_events` and updates `teams.score` to resolve any discrepancies. |

---

## 5. Secure CSV Final Results Export (Phase 7)

Organizers can download authoritative match results as a CSV spreadsheet at any time via the Admin Console or direct API endpoint:
```
GET /api/admin/export-csv?sessionId=cyber-mafia-live&adminKey=YOUR_SECRET_KEY
```

### 5.1 Required Columns
1. `Rank`: Deterministic ranking (1, 2, 3...).
2. `Team ID`: Squad identifier (e.g. `C01`).
3. `Team Name`: Display name (e.g. `Ghost Protocol`).
4. `Final Score`: Total points scored (+PTS).
5. `Completion Status`: `ACTIVE`, `ELIMINATED`, or `COMPLETED`.
6. `Levels Completed`: Count of stages solved.
7. `Game Start Timestamp`: Authoritative UTC start time.
8. `Game End Timestamp`: Authoritative UTC completion time.
9. `Total Wall-Clock Duration (s)`: Total elapsed seconds.
10. `Total Paused Duration (s)`: Total seconds paused.
11. `Active Gameplay Duration (s)`: Wall-clock minus paused intervals.

### 5.2 Formula Injection Security
To protect organizers opening the CSV in Excel, Google Sheets, or LibreOffice, all user-controlled text strings (team names, squad IDs) are checked against formula trigger characters:
- `=`, `+`, `-`, `@`, `\t`, `\r`
Any string beginning with these characters is prepended with a single quote `'` to neutralize formula execution. In addition, commas and quotes are escaped using RFC 4180 standards.
