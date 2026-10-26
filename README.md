# 🛡️ CYBER MAFIA — Multiplayer Cyber Infiltration & Social Deduction Game

[![Node.js](https://img.shields.io/badge/Node.js-v20%2B-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://react.dev/)
[![Socket.io](https://img.shields.io/badge/Socket.io-4.x-black.svg)](https://socket.io/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-CSS-38bdf8.svg)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-ISC-amber.svg)](LICENSE)

**CYBER MAFIA** is a tactical multiplayer web game combining **Mafia/social deduction**, **CTF challenges**, **simulated cybersecurity attacks**, **digital forensics**, and **covert deception**.

Squads are assigned secret roles (**Civilians** vs. **Hacker Cell**). Hackers must execute technical exploits to compromise civilian squads without blowing their cover. Civilians inspect telemetry, decode intercepted packets, piece together clues on an interactive Evidence Board, and formally indict suspected infiltrators before a high tribunal.

---

## 🔒 Important Security Principle

> **Strictly Simulated Environment**: Every vulnerability, session cookie, route traversal, and packet trace operates entirely within the game's authoritative simulated state machine. No real networks, accounts, devices, or systems are ever attacked.

---

## 🎮 The Core Gameplay Loop

```text
LANDING / TEAM LOBBY (1-15 Squads)
        ↓
SECRET ROLE ASSIGNMENT (Hacker Cell vs. Civilian Defenders)
        ↓
┌──────────────────────────────────────────────┐
│                HACKER PHASE                  │
│  Select Target → Choose Exploit Ability      │
│  → Solve Real CTF Payload (Cookie Shift,     │
│    Token Hunt, Route Break, Packet Decode)   │
│  → Target Compromised (Integrity Drops)       │
│  → Cryptographic Evidence Generated          │
│  → Optional: Spoof / Erase / Misdirect       │
└──────────────────────┬───────────────────────┘
                       ↓
┌──────────────────────────────────────────────┐
│               CIVILIAN PHASE                 │
│  Detect Subsystem Warnings (Vault / Net Mon) │
│  → Inspect Simulated Sessions & DOM          │
│  → Filter Security Audit Logs                │
│  → Deep Packet Route Tracer (4 Hops)         │
│  → Solve Forensic CTF Labs for Intel         │
│  → Pin Clues to Interactive Evidence Board   │
│  → Formulate Formal Indictment Dossier       │
└──────────────────────┬───────────────────────┘
                       ↓
┌──────────────────────────────────────────────┐
│            DEFENCE & TRIBUNAL PHASE          │
│  45s Emergency Clock                         │
│  → Accused Squad Presents Alibi / Rebuttal   │
│  → Tribunal Juries Cast Convict / Acquit Vote│
└──────────────────────┬───────────────────────┘
                       ↓
┌──────────────────────────────────────────────┐
│                 REVEAL PHASE                 │
│  Server Authoritative Role Unmasking         │
│  → Score Distribution (+300 PTS / -100 PTS)  │
│  → System Integrity Check → Next Round       │
└──────────────────────────────────────────────┘
```

---

## ⚡ Hacker Command Center

Hackers operate from an encrypted terminal with real technical attack vectors:

- **🍪 COOKIE SHIFT**: Intercept base64 session tokens, elevate privilege bits (e.g., `access=0` to `access=3`), and lock the target's Evidence Vault.
- **🔑 TOKEN HUNT**: Traverse simulated application endpoints (`/archive`, `/debug/memdump`) to reconstruct cryptographic key fragments.
- **🛣️ ROUTE BREAK**: Uncover hidden diagnostic and maintenance endpoints to compromise investigation tooling.
- **📦 PACKET DECODE**: Convert raw PCAP hexadecimal byte streams into ASCII override commands.

### Covert Deception Suite:
- **🎭 SPOOF**: Masquerade attacks to appear originating from another innocent squad's node.
- **🧹 ERASE**: Scrub a forensic record from central server storage.
- **📡 MISDIRECT**: Inject synthetic telemetry anomalies framing a rival squad.
- **⚡ COUNTERATTACK**: Remotely jam a civilian squad's investigation terminal for 45 seconds.

---

## 🛡️ Civilian Security Command Center

Civilians never receive direct hacker identities—they must build a forensic case:

- **🔍 SIMULATED INSPECTOR**: Inspect live session cookies, network headers, DOM structures, and module states.
- **📜 LOG ANALYZER**: Searchable, filterable event ledger. Correlate timestamps against node activity spikes.
- **🧭 PACKET TRACER**: Follow multi-hop ingress routes from core gateways down to origin node hints.
- **💻 FORENSIC CTF LAB**: Decode Base64 payloads, Hex buffers, MD5/SHA algorithm recognition, logic gate circuits, and hidden steganography headers to unlock high-confidence clues.
- **📌 EVIDENCE BOARD**: Interactive pin board to link attack signatures, timestamps, affected modules, and suspect nodes into an indictment dossier.

---

## ⚖️ Social Deduction & Accusation Tribunal

1. **Indictment**: Any squad can indict a suspect with attached evidence pins.
2. **45-Second Defence Clock**: The accused squad takes the stand to provide an alibi or challenge discrepancies.
3. **Tribunal Verdict**:
   - **🚨 Correct Conviction**: Hacker is quarantined; accusers earn `+300 PTS`.
   - **❌ False Accusation**: Innocent civilian acquitted; accusers penalized `-100 PTS`.

---

## 🛠️ Tech Stack & Architecture

- **Backend**: Node.js, Express 5, Socket.io 4.x
  - Authoritative Game Engine (`server/game/GameEngine.js`)
  - Redacted Role-Based State Sanitizer (`server/sockets/gameHandlers.js`)
  - Autonomous Bot AI for single-player testing (`server/game/botAI.js`)
  - Cryptographic Evidence Manager (`server/game/evidence.js`)
- **Frontend**: React 18, Vite 5, Tailwind CSS
  - Procedural Web Audio API sound synthesizer (`client/src/utils/soundEffects.js`)
  - Cyberpunk terminal aesthetics, Lucide icons, Canvas Confetti
- **Admin God-Mode**: Real-time phase override, bot toggling, role revelation, and attack injection.

---

## 🚀 Quickstart Guide

### 1. Prerequisites
- **Node.js** v18+ (tested on Node v20/v26)
- **npm** v9+

### 2. Installation
Clone the repository and install dependencies:

```bash
git clone https://github.com/chimchim-codes/cyber-mafia.git
cd cyber-mafia

# Install server dependencies
npm install

# Install client dependencies
cd client
npm install
cd ..
```

### 3. Build & Run
Build the React production client and start the server:

```bash
# Build frontend
npm run build

# Start the game server
npm start
```

Open your browser at **`http://localhost:3001`**.

> **Development Mode**:
> In another terminal, run `npm run client` to start the Vite HMR server on port `5173`.

---

## 🤖 Single-Player & Bot Simulation

Solo players can click **"Quick Match (with Bots)"** on the landing screen:
- Autonomous bot hackers launch attacks and solve technical payloads in real-time.
- Civilian bots investigate anomalies, solve CTF labs, and chat in the tactical comms feed.
- Accused bots submit contextual alibis during the Defence Phase.

---

## 🏆 Scoring Matrix

| Action | Score Effect |
| :--- | :--- |
| **Successful Target Compromise** | `+100 PTS` |
| **Solve Forensic CTF Lab** | `+75 PTS` |
| **Correct Hacker Conviction** | `+300 PTS` |
| **Survive a Round (>20% Integrity)** | `+50 PTS` |
| **Successful Deception / Misdirect** | `+100 PTS` |
| **Failed Attack Payload** | `-25 PTS` |
| **False Civilian Accusation** | `-100 PTS` |

---

## 📜 License

This project is licensed under the ISC License.
