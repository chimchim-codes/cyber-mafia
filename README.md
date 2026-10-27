# ⚖️ FALSE TRIALS
### Organized by init Association

[![React](https://img.shields.io/badge/React-18-blue.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5.4-purple.svg)](https://vitejs.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-v20%2B-green.svg)](https://nodejs.org/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-CSS-38bdf8.svg)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-ISC-amber.svg)](LICENSE)

**FALSE TRIALS** is a cybersecurity investigation and social deduction game organized by **init Association**. Investigators analyze authentic forensic documents, solve hands-on Python CTF coding challenges directly in their browser terminal, correlate suspicious telemetry logs, piece together conflicting evidence across multiple suspects, and formally indict the true perpetrator before the **High Tribunal**.

---

## 📑 Table of Contents
1. [Game Architecture & Overview](#-game-architecture--overview)
2. [Step-by-Step Game Solution Guide](#-step-by-step-game-solution-guide)
   - [Stage 1: Find the Bypass Key](#stage-1-find-the-bypass-key)
   - [Stage 2: Identify the Suspicious Login](#stage-2-identify-the-suspicious-login)
   - [Stage 3: Find the Impostor](#stage-3-find-the-impostor)
   - [Stage 4: Crack the Access Rule](#stage-4-crack-the-access-rule)
   - [Stage 5: Server Access Investigation](#stage-5-server-access-investigation)
   - [The High Tribunal: Final Accusation Answers](#the-high-tribunal-final-accusation-answers)
3. [Interface Guide: Tabs, Buttons & Windows](#-interface-guide-tabs-buttons--windows)
   - [Landing Lobby](#1-landing-lobby)
   - [Top HUD & Navigation Bar](#2-top-hud--navigation-bar)
   - [Investigation Tabs](#3-investigation-tabs)
   - [High Tribunal Indictment Modal](#4-high-tribunal-indictment-modal)
   - [Admin Control Panel & Proctoring Center](#5-admin-control-panel--proctoring-center)
4. [Anti-Cheat & Proctoring System](#-anti-cheat--proctoring-system)
5. [Database Setup & Self-Healing Architecture](#-database-setup--self-healing-architecture)
   - [Fixing "Could not find table in schema cache"](#fixing-could-not-find-the-table-publicgame_sessions-in-the-schema-cache)
   - [Vercel Deployment & Environment Variables](#vercel-deployment--environment-variables)

---

## 🔍 Game Architecture & Overview

In **FALSE TRIALS**, Dr. Adrian Vale (Chief AI Scientist) has been found collapsed over his terminal in Research Lab 101. Multiple prominent department leaders have conflicting alibis, suspicious log events, and motives against him.

Evidence is **not revealed all at once**. Forensic files are split into **6 progressive batches** containing 18 authentic reports (toxicology analyses, police first-responder files, CCTV server logs, deleted bash histories, witness interrogations, and biometric DNA cards). Solving each Python challenge unlocks the next evidence batch, gradually narrowing down the true culprit while dispelling false leads.

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        INVESTIGATION PIPELINE                          │
├─────────────────┬───────────────────────────────┬──────────────────────┤
│ STAGE           │ PYTHON CONCEPT & TARGET       │ UNLOCKED EVIDENCE    │
├─────────────────┼───────────────────────────────┼──────────────────────┤
│ Stage 1 (Lvl 1) │ String Manipulation & .split()│ Batch 2 (Logs/Police)│
│ Stage 2 (Lvl 2) │ Lists, Loops & Conditionals   │ Batch 3 (Bash/Alibis)│
│ Stage 3 (Lvl 3) │ Membership Checks (in/not in) │ Batch 4 (Confessions)│
│ Stage 4 (Lvl 4) │ Dual Boolean Logic (and/or)   │ Batch 5 (Memos/Gates)│
│ Stage 5 (Lvl 5) │ Structured Telemetry Parsing  │ Batch 6 (Biometrics) │
│ High Tribunal   │ 5-Point Formal Indictment     │ CASE SOLVED VERDICT  │
└─────────────────┴───────────────────────────────┴──────────────────────┘
```

---

## 🏆 Step-by-Step Game Solution Guide

### Stage 1: Find the Bypass Key
- **Difficulty:** Level 1 // Foundation
- **Concept:** String manipulation & `.split()`
- **Forensic Context:** A corrupted gateway buffer packet was recovered from the firewall ingress router. Extract the administrative bypass key from the raw HTTP header.
- **Starter Code:**
```python
# Challenge 1: Find the Bypass Key
# Extract the value of X-Bypass-Key from the raw HTTP header string.

header = "Host: sec.local\r\nX-Bypass-Key: BYPASS-ELENA-WARD-99\r\nUser-Agent: Terminal/1.0"

# TODO: Use string .split() to isolate and print the key value
lines = header.split("\r\n")
bypass_key = ""
for line in lines:
    if line.startswith("X-Bypass-Key:"):
        bypass_key = line.split(": ")[1]

print(bypass_key)
```
- **How to Solve:**
  1. Click **Run Code** in the terminal.
  2. The script splits the header by newline `\r\n` and extracts the value following `X-Bypass-Key: `.
  3. The resulting key printed to the terminal is:
     ```text
     BYPASS-ELENA-WARD-99
     ```
  4. Type or paste `BYPASS-ELENA-WARD-99` (or `BYPASS-ELENA-WARD`) into the **Submit Answer** field and click **Submit Answer**.
- **Reward:** `+100 PTS` | Unlocks **Evidence Batch 2** (Police interview with Dr. Sen, Ingress Syslog dump, and Felix Grant's shift notes).

---

### Stage 2: Identify the Suspicious Login
- **Difficulty:** Level 2 // Intermediate
- **Concept:** Lists, loops & `if` conditions
- **Forensic Context:** Workstation auth logs recorded several login attempts right before terminal history was wiped. Identify the username that recorded a `"FAILED"` login event.
- **Starter Code:**
```python
# Challenge 2: Identify the Suspicious Login
# Search through login_records to find the username with "FAILED" status.

login_records = [
    ("mira_sen", "SUCCESS"),
    ("noah_mercer", "SUCCESS"),
    ("felix_grant", "SUCCESS"),
    ("guest_temp", "FAILED"),
    ("elena_ward", "SUCCESS")
]

# TODO: Loop over login_records and find the failed username
suspicious_user = ""
for user, status in login_records:
    if status == "FAILED":
        suspicious_user = user
        break

print(suspicious_user)
```
- **How to Solve:**
  1. Click **Run Code**.
  2. The loop inspects each tuple and flags `"guest_temp"` whose login status was `"FAILED"`.
  3. The output printed to the terminal is:
     ```text
     guest_temp
     ```
  4. Enter `guest_temp` into the answer field and click **Submit Answer**.
- **Reward:** `+100 PTS` | Unlocks **Evidence Batch 3** (Noah Mercer's deleted bash history, Noah's interrogation transcript, Dr. Sen's patent notice).

---

### Stage 3: Find the Impostor
- **Difficulty:** Level 3 // Advanced
- **Concept:** Membership checks (`in` / `not in`) & collections
- **Forensic Context:** Core database logs show an active account that executed elevated privileges. Cross-reference logged usernames against authorized personnel to identify the unlisted impostor.
- **Starter Code:**
```python
# Challenge 3: Find the Impostor
# Find the username in logged_users that is absent from authorized_users.

authorized_users = ["mira_sen", "noah_mercer", "felix_grant", "elena_ward", "adrian_vale"]
logged_users = ["mira_sen", "felix_grant", "shadow_operator", "elena_ward"]

# TODO: Use a membership check (user not in authorized_users)
impostor = ""
for user in logged_users:
    if user not in authorized_users:
        impostor = user
        break

print(impostor)
```
- **How to Solve:**
  1. Click **Run Code**.
  2. The code iterates through `logged_users` and checks membership against `authorized_users`.
  3. `"shadow_operator"` does not exist in the authorized list and is printed:
     ```text
     shadow_operator
     ```
  4. Enter `shadow_operator` into the answer box and click **Submit Answer**.
- **Reward:** `+100 PTS` | Unlocks **Evidence Batch 4** (Rogue user database trace, Felix Grant's bribe confession, and chemical quarantine verification).

---

### Stage 4: Crack the Access Rule
- **Difficulty:** Level 4 // Secure Access
- **Concept:** Boolean logic & dual conditions (`and`)
- **Forensic Context:** Dr. Vale's private research sanctum was locked by an automated dual-authentication policy. Test the rule to determine the exact return status for user `"elena_ward"` with access code `"SEC-7702"`.
- **Starter Code:**
```python
# Challenge 4: Crack the Access Rule
# Grant access only when user is authorized AND code matches valid_code.

def check_access(user, code):
    authorized_users = ["elena_ward", "adrian_vale"]
    valid_code = "SEC-7702"
    
    # Dual-condition verification
    if user in authorized_users and code == valid_code:
        return "ACCESS_GRANTED"
    else:
        return "ACCESS_DENIED"

# Evaluate for executive Elena Ward with code SEC-7702
result = check_access("elena_ward", "SEC-7702")
print(result)
```
- **How to Solve:**
  1. Click **Run Code**.
  2. Both conditions evaluate to `True` (`"elena_ward"` is in `authorized_users` and code `"SEC-7702"` matches `valid_code`).
  3. The return value printed is:
     ```text
     ACCESS_GRANTED
     ```
  4. Enter `ACCESS_GRANTED` into the answer box and submit.
- **Reward:** `+100 PTS` | Unlocks **Evidence Batch 5** (Elena's deleted offshore emails, door override logs, and executive lounge witness statement).

---

### Stage 5: Server Access Investigation
- **Difficulty:** Level 5 // Senior Forensics
- **Concept:** Structured telemetry parsing, filtering status codes, and finding the maximum timestamp
- **Forensic Context:** Analyze authentication telemetry logs on the morning of the incident. Identify the person responsible for the **latest successful login** (`status == 200`), ignoring later failed (401) or forbidden (403) events.
- **Starter Code:**
```python
# Challenge 5: Server Access Investigation
# Analyze structured authentication telemetry.
# Identify the username responsible for the LATEST SUCCESSFUL login (status == 200).
# Ignore subsequent failed (401) or forbidden (403) events.

auth_logs = [
    {"timestamp": "08:12:00", "user": "mira_sen", "status": 200, "ip": "10.0.1.12", "msg": "Auth OK - Workstation B"},
    {"timestamp": "08:19:30", "user": "noah_mercer", "status": 200, "ip": "10.0.1.45", "msg": "Auth OK - Server Sub-1"},
    {"timestamp": "08:24:10", "user": "felix_grant", "status": 200, "ip": "10.0.2.19", "msg": "Auth OK - Security Desk"},
    {"timestamp": "08:31:45", "user": "elena_ward", "status": 200, "ip": "10.0.4.01", "msg": "Auth OK - Executive Gateway"},
    {"timestamp": "08:34:10", "user": "felix_grant", "status": 401, "ip": "10.0.2.19", "msg": "Auth Failed - Bad Pin"},
    {"timestamp": "08:38:00", "user": "mira_sen", "status": 403, "ip": "10.0.1.12", "msg": "Access Denied - Lockdown Active"},
    {"timestamp": "08:42:15", "user": "noah_mercer", "status": 401, "ip": "10.0.1.45", "msg": "Auth Failed - Session Terminated"}
]

# TODO: Filter where status == 200, and find user with maximum timestamp
successful_logins = [log for log in auth_logs if log["status"] == 200]
latest_successful = max(successful_logins, key=lambda x: x["timestamp"])

print(latest_successful["user"])
```
- **How to Solve:**
  1. Click **Run Code**.
  2. The code filters entries where `status == 200`:
     - `08:12:00`: mira_sen
     - `08:19:30`: noah_mercer
     - `08:24:10`: felix_grant
     - `08:31:45`: elena_ward
  3. The maximum timestamp among successful logins is `08:31:45`, which belongs to `elena_ward`.
  4. The terminal prints:
     ```text
     elena_ward
     ```
  5. Enter `elena_ward` into the answer field and submit.
- **Reward:** `+100 PTS` | Unlocks **Final Batch 6** (Master auth telemetry ledger, biometric fingerprint match report `BIO-602`, and the High Tribunal dossier).

---

### The High Tribunal: Final Accusation Answers

Once you have unlocked the evidence and identified the timeline, click the red **🚨 ACCUSE CULPRIT** button in the top navigation bar to open the indictment modal. Submit the following answers:

| Question # | Question Title | Correct Answer Option | Forensic Explanation & Evidence Link |
| :--- | :--- | :--- | :--- |
| **Q1** | **Who murdered Dr. Adrian Vale?** | **D: Elena Ward** | Elena Ward (Director of Operations) was placed at Adrian's desk right before he collapsed. |
| **Q2** | **What was the murder weapon or method?** | **A: Poison administered through a drink** | Toxicology report `TOX-102` confirms lethal organophosphate neurotoxin mixed into hot Colombian coffee. |
| **Q3** | **What was the killer’s primary motive?** | **B: Preventing Adrian from exposing unauthorized research exports** | Recovered emails `MEM-501` prove Adrian caught Elena illicitly transferring $12M of foundation model weights offshore and scheduled a formal audit for 09:00 AM. |
| **Q4** | **Who assisted the killer in carrying out or concealing the crime?** | **D: No accomplice has been established** *(Option C: Felix Grant is also accepted)* | Elena administered the poison alone. Felix Grant took a $50,000 bribe (`POL-402`) to loop Camera 4, but did not participate in the murder. |
| **Q5** | **Which pieces of evidence support the accusation?** | **Select ALL Four (A, B, C, D)** | • `TOX-102` (Neurotoxin in drink)<br>• `MEM-501` (Exposing $12M export)<br>• `WIT-503 & SEC-502` (Coffee delivery at 08:28-08:31)<br>• `BIO-602 & LOG-601` (Biometric DNA match on mug handle & gateway auth at 08:31:45) |

**Verdict Result:**
Submitting these answers immediately solves the case, awards `+500 PTS`, records your official stopwatch completion time, and generates a downloadable **Official High Tribunal Certificate Record**.

---

## 🖥️ Interface Guide: Tabs, Buttons & Windows

### 1. Landing Lobby
The entry terminal where players and admins configure their credentials before beginning:
- **Investigator Name / Call-Sign Input:** Enter your name or handle (e.g., `Investigator Sam`).
- **System No. / Terminal ID Input:** Enter your physical workstation ID (e.g., `SYS-04`, `PC-12`). This is recorded in the proctoring audit log and shown on the live leaderboard.
- **Squad Selection Grid:** Choose your assigned squad (`C01` through `C08`) or provide a custom squad name.
- **"INITIALIZE INVESTIGATION TERMINAL" Button:** Launches the session, begins the stopwatch timer, and locks the browser into fullscreen mode.
- **"⚙️ Admin Access" Toggle:** Opens the administrative authentication field. Enter the master key to bypass proctoring restrictions and access the Admin Control Panel.

---

### 2. Top HUD & Navigation Bar
Persistent across all screens during gameplay:
- **Station & Squad Indicator:** Displays your active terminal ID (e.g., `STATION: SYS-04`) and assigned squad name.
- **⏱️ STOPWATCH (`MM:SS`):** Tracks your active investigation time running upwards from `00:00`. If you reload the browser, your elapsed time is safely restored.
- **Integrity Bar:** Monitors workstation integrity (`100%`).
- **Score Counter:** Displays real-time points accumulated from challenge completions and tribunal verdicts.
- **"🚨 ACCUSE CULPRIT" Button:** Opens the High Tribunal Indictment modal at any time to file charges against the killer.
- **"Fullscreen Toggle" Button:** Re-enters fullscreen mode if accidentally exited.
- **"⚙️ ADMIN PANEL" Button:** Appears for authenticated administrators, allowing full oversight and emergency resets.

---

### 3. Investigation Tabs

#### 💻 Tab 1: CTF Lab / Python Terminal
- **Stage Progression Tracker:** Displays Stages 1 through 5. Solved stages show a green checkmark. Future stages remain securely locked until the current stage is completed.
- **Interactive Python Code Editor:** Pre-loaded with challenge templates. Players can edit code, add print statements, and test algorithms.
- **"▶ RUN CODE" Button:** Executes the Python script in an isolated in-browser runtime and displays stdout in the dark terminal window below.
- **"Terminal Output Window":** Displays execution output, syntax errors, and print statements.
- **"Submit Answer" Input & Button:** Enter the exact output value produced by your script. Valid solutions automatically award points, advance to the next stage, and unlock the next evidence batch.
- **"💡 Unlock Stage Hint" Button:** Consumes 1 of your 3 investigation hints to display targeted guidance for the active stage.

#### 📁 Tab 2: Evidence Locker
- **Batch Filter / Dossier Grid:** Displays all unlocked evidence files (up to 18 reports across 6 batches).
- **Classification Badges:** Clearly labels document types (`POLICE_REPORT`, `FORENSIC_TOXICOLOGY`, `SECURITY_AUDIT`, `WITNESS_TRANSCRIPT`, `BIOMETRIC_DNA`).
- **Card Expansion:** Clicking any card opens the authentic, full-text forensic report with official dispatch numbers, officer badge IDs, and timestamps.
- **Conflicting Evidence Indicator:** Highlights how earlier evidence points toward multiple suspects (Dr. Sen, Noah Mercer, Felix Grant) to prevent premature accusations.

#### 📜 Tab 3: Telemetry Logs / Forensic Audit
- **Real-Time Event Stream:** Displays live server telemetry, security anomalies, gateway breaches, and forensic challenge completions.
- **Search & Type Filter:** Filter events by `ALL`, `BREACH`, `ANOMALY`, or `FORENSIC_SOLVE`.

#### 📊 Tab 4: Live Leaderboard
- **Ranked Standings:** Automatically ranks teams by total score, stages completed, and stopwatch duration.
- **Station ID Column:** Shows the physical workstation ID (e.g., `SYS-04`) alongside team names.
- **Offline / Standalone Fallback:** Displays local squad performance immediately even before server synchronization.

---

### 4. High Tribunal Indictment Modal
- **Trigger:** Opened by clicking **🚨 ACCUSE CULPRIT** in the top navigation bar.
- **5-Question Structured Indictment:** Contains 4 single-choice questions and 1 multi-select supporting evidence checklist.
- **Validation Engine:** Automatically checks answers, computes the verdict, records the exact stopwatch duration, and outputs a downloadable timestamped forensic verdict certificate.

---

### 5. Admin Control Panel & Proctoring Center

Accessible by entering the master key in the lobby or clicking **ADMIN PANEL** in the top HUD:

1. **Master Header:**
   - Displays the active admin status, squad name, and station terminal ID.
   - **"🚪 Exit to Lobby" Button:** Allows the admin to freely leave the dashboard and return to the lobby at any time without triggering breach alerts.
   - **"⚠️ Reset Game" Button:** Master reset button that erases all saved player progress, wipes localStorage code buffers and terminal outputs, clears submitted answers, and resets the stopwatch to `00:00`.
2. **Tabs in Admin Panel:**
   - **📋 Chronological Activity & Proctoring Audit:** A live chronological ledger displaying:
     - Player logins with investigator name, system terminal ID, and timestamp.
     - Proctoring security breach alerts (fullscreen exit, tab switches, window blur).
     - Challenge completion events with earned scores.
     - Search and filter tools to monitor suspicious investigator actions.
   - **⏱️ Stopwatch & Match Lifecycle:** Displays authoritative server elapsed time, with buttons to Pause, Resume, or Reset the match.
   - **📊 Leaderboard & Score Adjustments:** Manually adjust squad scores, award bonus points, or view complete rankings.
   - **💾 Recovery Snapshots:** View and restore point-in-time state snapshots if a team experiences a hardware malfunction.
   - **📥 Export CSV:** One-click download of the complete match results, scores, station numbers, and security audit log formatted for spreadsheet review.

---

## 🛡️ Anti-Cheat & Proctoring System

To maintain competitive integrity during live techfest tournaments:
1. **Automatic Fullscreen Lock:** Once the game starts, players are placed into fullscreen mode.
2. **Window & Tab Blur Detection:** If an investigator attempts to navigate away, open developer tools, minimize the browser, or switch tabs, an instant security warning modal is triggered on their screen.
3. **Admin Activity Feed:** Every exit from fullscreen or window blur event is instantly logged to the Admin Panel with the exact timestamp, investigator name, and physical system terminal ID.
4. **Admin Exemption:** Administrators are completely exempt from fullscreen locking and breach logging.

---

## 🗄️ Database Setup & Self-Healing Architecture

### Fixing: "Could not find the table 'public.game_sessions' in the schema cache"

If you connect a Supabase project and see this error in your console or API responses:
```json
{"success":false,"message":"Could not find the table 'public.game_sessions' in the schema cache"}
```
This indicates that the PostgreSQL tables have not yet been created in your Supabase database schema.

#### Resolution Steps:
1. Open your [Supabase Dashboard](https://app.supabase.com/).
2. Select your project and navigate to the **SQL Editor** in the left sidebar.
3. Open the migration file in this repository:
   ```text
   supabase/migrations/001_initial_schema.sql
   ```
4. Copy the entire contents of `001_initial_schema.sql` into the Supabase SQL Editor and click **Run**.
5. The tables (`game_sessions`, `teams`, `score_events`, `checkpoints`, `snapshots`, `audit_logs`) will be created with proper foreign keys and indexes.

#### Automatic Self-Healing Fallback
If Supabase environment variables are missing, or if the tables have not been migrated yet, the game's backend **automatically activates an in-memory mock store**. The game will never crash with a 500 error, and all gameplay, leaderboards, CSV exports, and stopwatch features will continue running smoothly.

---

### Vercel Deployment & Environment Variables

When deploying to [Vercel](https://vercel.com/):

1. **Root Directory:** Keep as default (`.`).
2. **Build Command:** `npm run build`
3. **Output Directory:** `dist`
4. **Environment Variables:**
   - `ADMIN_SECRET_KEY`: Set your master administrative password (e.g., `init-admin-2026`).
   - `SUPABASE_URL` *(Optional)*: Your Supabase project URL.
   - `SUPABASE_SERVICE_ROLE_KEY` *(Optional)*: Your Supabase service role secret key.

---

## 👥 Credits
- **Event:** Internal Techfest 2026
- **Organization:** **init Association**
- **Investigation:** FALSE TRIALS // Dr. Adrian Vale Case
