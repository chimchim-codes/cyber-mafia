// server/game/GameEngine.js
// Core Game Engine for CYBER MAFIA

const EventEmitter = require('events');
const crypto = require('crypto');
const { generateHackerChallenge, generateCivilianLabChallenges } = require('./challenges');
const EvidenceManager = require('./evidence');
const BotAI = require('./botAI');

class GameEngine extends EventEmitter {
  constructor() {
    super();
    this.phase = 'LOBBY'; // LOBBY, ROLE_ASSIGNMENT, HACKER_PHASE, CIVILIAN_PHASE, DEFENCE_PHASE, REVEAL_PHASE, GAME_OVER
    this.round = 1;
    this.maxRounds = 5;
    this.timer = 120; // seconds remaining in current phase
    this.phaseDuration = {
      HACKER_PHASE: 90,
      CIVILIAN_PHASE: 150,
      DEFENCE_PHASE: 45,
      REVEAL_PHASE: 15,
      ROLE_ASSIGNMENT: 10
    };
    this.isPaused = false;
    this.timerInterval = null;

    // Teams collection
    this.teams = [];
    this.hackerCount = 2; // default
    this.totalTeamsCount = 8; // default (supports up to 15)

    // Systems
    this.evidenceManager = new EvidenceManager();
    this.botAI = new BotAI(this);

    // Active challenges pending submission
    this.activeAttackChallenges = {}; // key: challengeId -> challenge object

    // Civilian CTF Lab Challenges for current round
    this.civilianLabChallenges = generateCivilianLabChallenges();

    // Game Logs (Fictional cybersecurity logs)
    this.systemLogs = [];

    // Chat messages
    this.chatMessages = [];

    // Active Accusation and Defence State
    this.activeAccusation = null;
    this.defenseStatement = null;
    this.juryVotes = {}; // teamId -> 'GUILTY' | 'NOT_GUILTY'
    this.revealResult = null;

    // Deception modifiers currently active
    this.activeSpoofs = {}; // hackerTeamId -> { spoofedNode, spoofedSig }
    this.disabledCivilianModules = {}; // teamId -> { module, untilEpoch }

    // Scoring Rules (Configurable by admin)
    this.scoringRules = {
      COMPROMISE_SUCCESS: 100,
      SOLVE_INVESTIGATION_CTF: 75,
      CORRECT_HACKER_ACCUSATION: 300,
      SURVIVE_ROUND: 50,
      FALSE_ACCUSATION_PENALTY: -100,
      FAILED_ATTACK_PENALTY: -25,
      SUCCESSFUL_DECEPTION: 100
    };

    this.initDefaultTeams();
  }

  initDefaultTeams(count = 8, hackers = 2) {
    this.totalTeamsCount = count;
    this.hackerCount = hackers;
    this.teams = [];

    const defaultNames = [
      'Ghost Protocol', 'Cyber Sentinel', 'Phantom Root', 'Zero Day Ops',
      'Quantum Shield', 'Binary Vanguard', 'Dark Matrix', 'Cipher Guard',
      'Echo Infiltrator', 'Aegis Core', 'Apex Predator', 'Stealth Daemon',
      'Firewall Elite', 'Black Ice', 'Shadow Nexus'
    ];

    for (let i = 1; i <= count; i++) {
      const id = (i < 10 ? 'C0' : 'C') + i;
      this.teams.push({
        id,
        name: defaultNames[i - 1] || `Sector ${id}`,
        players: [],
        role: 'CIVILIAN', // determined at game start
        secretRevealed: false,
        integrity: 100,
        score: 0,
        isBot: true, // becomes false when human player joins team
        isEliminated: false,
        modules: {
          dashboard: 'ACTIVE',
          investigation: 'ACTIVE',
          evidenceVault: 'ACTIVE',
          networkMonitor: 'ACTIVE'
        },
        cooldowns: {
          attack: 0,
          spoof: 0,
          erase: 0,
          misdirect: 0,
          counterattack: 0,
          impersonate: 0
        },
        attackHistory: [],
        suspicion: 'LOW',
        evidenceCount: 0
      });
    }

    this.logSystem('INITIALIZE', 'SYSTEM', `Game environment ready with ${count} teams.`);
  }

  // Join or assign a player to a team
  joinTeam(socketId, playerName, teamId) {
    // Remove player from previous team if any
    this.teams.forEach(t => {
      t.players = t.players.filter(p => p.socketId !== socketId);
      if (t.players.length === 0) {
        t.isBot = true;
      }
    });

    let targetTeam = this.teams.find(t => t.id === teamId);
    if (!targetTeam) {
      // Pick first available team with < 3 players
      targetTeam = this.teams.find(t => t.players.length < 3) || this.teams[0];
    }

    if (targetTeam && targetTeam.players.length < 3) {
      targetTeam.players.push({
        socketId,
        name: playerName || `Agent_${crypto.randomBytes(2).toString('hex')}`,
        joinedAt: Date.now()
      });
      targetTeam.isBot = false;
    }

    this.emitStateUpdate();
    return targetTeam;
  }

  // Leave / Disconnect player
  removePlayer(socketId) {
    this.teams.forEach(t => {
      t.players = t.players.filter(p => p.socketId !== socketId);
      if (t.players.length === 0) {
        t.isBot = true;
      }
    });
    this.emitStateUpdate();
  }

  // Start the Game: Secret Role Assignment & Phase 1
  startGame() {
    this.phase = 'ROLE_ASSIGNMENT';
    this.round = 1;
    this.assignSecretRoles();
    this.timer = this.phaseDuration.ROLE_ASSIGNMENT;
    this.botAI.start();

    this.logSystem('GAME_START', 'CORE', `CYBER MAFIA initiated. Round 1 in progress.`);
    this.startTimer();
    this.emitStateUpdate();
  }

  assignSecretRoles() {
    // Reset all to civilian
    this.teams.forEach(t => {
      t.role = 'CIVILIAN';
      t.integrity = 100;
      t.secretRevealed = false;
      t.isEliminated = false;
      t.modules = {
        dashboard: 'ACTIVE',
        investigation: 'ACTIVE',
        evidenceVault: 'ACTIVE',
        networkMonitor: 'ACTIVE'
      };
    });

    // Shuffle and pick hackers
    const shuffledIndices = [...Array(this.teams.length).keys()].sort(() => Math.random() - 0.5);
    for (let i = 0; i < this.hackerCount; i++) {
      const idx = shuffledIndices[i];
      if (this.teams[idx]) {
        this.teams[idx].role = 'HACKER';
      }
    }
  }

  // Timer Tick
  startTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      if (this.isPaused) return;

      if (this.timer > 0) {
        this.timer--;
        this.emit('timer_tick', { timer: this.timer, phase: this.phase });
      } else {
        this.advancePhase();
      }
    }, 1000);
    if (this.timerInterval && this.timerInterval.unref) {
      this.timerInterval.unref();
    }
  }

  // Advance between game phases
  advancePhase() {
    if (this.phase === 'ROLE_ASSIGNMENT') {
      this.phase = 'HACKER_PHASE';
      this.timer = this.phaseDuration.HACKER_PHASE;
      this.logSystem('PHASE_CHANGE', 'GLOBAL', `=== HACKER INFILTRATION PHASE ACTIVATED ===`);
    } else if (this.phase === 'HACKER_PHASE') {
      this.phase = 'CIVILIAN_PHASE';
      this.timer = this.phaseDuration.CIVILIAN_PHASE;
      this.logSystem('PHASE_CHANGE', 'GLOBAL', `=== CIVILIAN INVESTIGATION & DEFENCE PHASE ACTIVATED ===`);
    } else if (this.phase === 'CIVILIAN_PHASE') {
      // Round conclusion
      this.evaluateRoundSurvival();
      if (this.round >= this.maxRounds || this.checkWinCondition()) {
        this.endGame();
        return;
      }
      this.round++;
      this.phase = 'HACKER_PHASE';
      this.timer = this.phaseDuration.HACKER_PHASE;
      this.logSystem('ROUND_START', 'GLOBAL', `Round ${this.round} begins.`);
    } else if (this.phase === 'DEFENCE_PHASE') {
      this.resolveAccusation();
    } else if (this.phase === 'REVEAL_PHASE') {
      this.activeAccusation = null;
      this.defenseStatement = null;
      this.juryVotes = {};
      this.revealResult = null;

      if (this.checkWinCondition()) {
        this.endGame();
      } else {
        this.phase = 'CIVILIAN_PHASE';
        this.timer = 60; // continue investigation
      }
    }

    this.emitStateUpdate();
  }

  evaluateRoundSurvival() {
    this.teams.forEach(t => {
      if (!t.isEliminated && t.integrity > 20) {
        t.score += this.scoringRules.SURVIVE_ROUND;
      }
    });
  }

  checkWinCondition() {
    const aliveHackers = this.teams.filter(t => t.role === 'HACKER' && !t.isEliminated);
    const aliveCivilians = this.teams.filter(t => t.role === 'CIVILIAN' && !t.isEliminated);

    if (aliveHackers.length === 0) {
      this.logSystem('VICTORY', 'SECURITY', 'All Hackers eliminated! Civilian victory.');
      return true;
    }
    if (aliveCivilians.length <= aliveHackers.length) {
      this.logSystem('VICTORY', 'DARK_NET', 'Civilians outnumbered! Hackers dominate.');
      return true;
    }
    return false;
  }

  endGame() {
    this.phase = 'GAME_OVER';
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.botAI.stop();
    // Reveal all roles
    this.teams.forEach(t => t.secretRevealed = true);
    this.logSystem('GAME_OVER', 'GLOBAL', `Match concluded. Final scores tallied.`);
    this.emitStateUpdate();
  }

  // === HACKER ACTIONS ===

  generateAttackChallenge(attackerTeamId, targetTeamId, attackType) {
    const attacker = this.teams.find(t => t.id === attackerTeamId);
    const target = this.teams.find(t => t.id === targetTeamId);

    if (!attacker || !target || attacker.role !== 'HACKER' || target.isEliminated) {
      return null;
    }

    const challenge = generateHackerChallenge(attackType, target, attacker);
    if (challenge) {
      challenge.attackerTeamId = attackerTeamId;
      challenge.targetTeamId = targetTeamId;
      this.activeAttackChallenges[challenge.id] = challenge;
    }
    return challenge;
  }

  submitAttackSolution(attackerTeamId, challengeId, solution) {
    const challenge = this.activeAttackChallenges[challengeId];
    if (!challenge || challenge.attackerTeamId !== attackerTeamId) {
      return { success: false, message: 'Invalid or expired challenge.' };
    }

    const attacker = this.teams.find(t => t.id === attackerTeamId);
    const target = this.teams.find(t => t.id === challenge.targetTeamId);

    // Normalize solution comparison
    const isCorrect = (solution || '').trim().toLowerCase() === (challenge.expectedSolution || '').trim().toLowerCase();

    if (!isCorrect) {
      attacker.score += this.scoringRules.FAILED_ATTACK_PENALTY;
      delete this.activeAttackChallenges[challengeId];
      this.logSystem('ATTACK_FAIL', `NODE-${attacker.id}`, `Infiltration attempt failed against ${target.id}`);
      this.emitStateUpdate();
      return { success: false, message: 'Attack payload rejected. Trace alert triggered!' };
    }

    // SUCCESSFUL COMPROMISE
    delete this.activeAttackChallenges[challengeId];
    attacker.score += this.scoringRules.COMPROMISE_SUCCESS;

    // Apply damage & module lock to target
    let moduleTarget = 'evidenceVault';
    if (challenge.type === 'COOKIE_SHIFT') {
      moduleTarget = 'evidenceVault';
      target.integrity = Math.max(0, target.integrity - 20);
      target.modules.evidenceVault = 'DISABLED';
    } else if (challenge.type === 'TOKEN_HUNT') {
      moduleTarget = 'networkMonitor';
      target.integrity = Math.max(0, target.integrity - 25);
      target.modules.networkMonitor = 'DISABLED';
    } else if (challenge.type === 'ROUTE_BREAK') {
      moduleTarget = 'investigation';
      target.integrity = Math.max(0, target.integrity - 30);
      target.modules.investigation = 'DISABLED';
    } else if (challenge.type === 'PACKET_DECODE') {
      moduleTarget = 'dashboard';
      target.integrity = Math.max(0, target.integrity - 20);
      target.modules.dashboard = 'WARNING';
    }

    if (target.integrity <= 0) {
      target.isEliminated = true;
      this.logSystem('COMPROMISED', target.id, `CRITICAL: Team ${target.id} system integrity collapsed!`);
    }

    // Check if hacker had active spoof
    const spoofData = this.activeSpoofs[attackerTeamId] || {};
    delete this.activeSpoofs[attackerTeamId]; // one-time use

    // Create Evidence
    const evidence = this.evidenceManager.createAttackEvidence({
      attackerTeam: attacker,
      targetTeam: target,
      attackType: challenge.type,
      signature: challenge.signature,
      route: challenge.initialData?.sampleBase || `/api/v1/${moduleTarget.toLowerCase()}`,
      moduleAffected: moduleTarget,
      spoofedNode: spoofData.spoofedNode,
      spoofedSig: spoofData.spoofedSig
    });

    target.evidenceCount++;
    target.attackHistory.push({
      attackType: challenge.type,
      timestamp: evidence.timestamp,
      moduleAffected: moduleTarget,
      damage: 20
    });

    // Generate System Logs
    const reportedNode = spoofData.spoofedNode || `NODE-${attacker.id}`;
    this.logSystem('BREACH', reportedNode, `${target.id} ${moduleTarget} unauthorized access [Sig: ${evidence.attackSignature}]`);
    this.logSystem('ANOMALY', target.id, `Session state modified. Integrity dropped to ${target.integrity}%`);

    this.emitStateUpdate();

    return {
      success: true,
      message: `Target ${target.id} compromised! ${moduleTarget} offline. Evidence generated.`,
      damage: 20,
      evidenceId: evidence.id
    };
  }

  // Hacker Deception Abilities
  useDeception(hackerTeamId, abilityType, payload) {
    const hacker = this.teams.find(t => t.id === hackerTeamId);
    if (!hacker || hacker.role !== 'HACKER') {
      return { success: false, message: 'Unauthorized action.' };
    }

    const now = Date.now();

    switch (abilityType) {
      case 'SPOOF': {
        const targetSuspect = this.teams.find(t => t.id === payload.fakeSuspectTeamId);
        if (!targetSuspect) return { success: false, message: 'Select a valid team to frame.' };
        this.activeSpoofs[hackerTeamId] = {
          spoofedNode: `NODE-${targetSuspect.id}`,
          spoofedSig: 'CS-' + (Math.floor(Math.random() * 90) + 10)
        };
        hacker.score += this.scoringRules.SUCCESSFUL_DECEPTION;
        this.logSystem('DECEPTION', 'DARK_NET', `Stealth routing engaged: signature masquerade primed.`);
        this.emitStateUpdate();
        return { success: true, message: `Next attack will appear originating from NODE-${targetSuspect.id}.` };
      }

      case 'ERASE': {
        const evidenceId = payload.evidenceId;
        const erased = this.evidenceManager.eraseEvidence(evidenceId, hackerTeamId);
        if (erased) {
          hacker.score += this.scoringRules.SUCCESSFUL_DECEPTION;
          this.logSystem('DATA_WIPE', 'KERNEL', `Evidence index ${evidenceId} wiped from forensic storage.`);
          this.emitStateUpdate();
          return { success: true, message: `Evidence ${evidenceId} scrubbed from records.` };
        }
        return { success: false, message: 'Evidence not found or already purged.' };
      }

      case 'MISDIRECT': {
        const fakeTeam = this.teams.find(t => t.id === payload.fakeTeamId);
        if (!fakeTeam) return { success: false, message: 'Invalid team.' };
        this.logSystem('AUDIT_WARN', `NODE-${fakeTeam.id}`, `Suspicious credential replay detected on port 443`);
        hacker.score += this.scoringRules.SUCCESSFUL_DECEPTION;
        this.emitStateUpdate();
        return { success: true, message: `Injected suspicious event attributed to NODE-${fakeTeam.id}.` };
      }

      case 'COUNTERATTACK': {
        const targetCivilian = this.teams.find(t => t.id === payload.targetCivilianId);
        if (!targetCivilian) return { success: false, message: 'Invalid target.' };
        targetCivilian.modules.investigation = 'DISABLED';
        this.logSystem('JAMMING', targetCivilian.id, `Investigation Terminal jammed by counter-frequency attack.`);
        this.emitStateUpdate();
        return { success: true, message: `Civilian ${targetCivilian.id}'s investigation tools disabled for 45s.` };
      }

      case 'IMPERSONATE': {
        this.logSystem('SECURITY_ALERT', 'ROOT_DAEMON', payload.fakeLogText || `Kernel integrity check failed for sector C02.`);
        hacker.score += this.scoringRules.SUCCESSFUL_DECEPTION;
        this.emitStateUpdate();
        return { success: true, message: `Fake system log entry dispatched.` };
      }

      default:
        return { success: false, message: 'Unknown deception ability.' };
    }
  }

  // === CIVILIAN ACTIONS ===

  solveCivilianChallenge(teamId, challengeId, answer) {
    const team = this.teams.find(t => t.id === teamId);
    const chal = this.civilianLabChallenges.find(c => c.id === challengeId);

    if (!team || !chal) {
      return { success: false, message: 'Challenge not found.' };
    }

    if (chal.solvedBy && chal.solvedBy.includes(teamId)) {
      return { success: false, message: 'Challenge already solved by your team.' };
    }

    const isCorrect = (answer || '').trim().toLowerCase() === (chal.expected || '').trim().toLowerCase();

    if (isCorrect) {
      if (!chal.solvedBy) chal.solvedBy = [];
      chal.solvedBy.push(teamId);
      team.score += chal.rewardScore || 75;

      // Unlock matching evidence clue or grant new forensic intelligence
      this.logSystem('FORENSIC_SOLVE', team.id, `CTF Lab Challenge [${chal.title}] solved! Intelligence unlocked.`);

      // Enhance any existing evidence related to this clue
      this.evidenceManager.evidenceList.forEach(ev => {
        this.evidenceManager.enhanceEvidence(ev.id, teamId, chal.evidenceClue);
      });

      this.emitStateUpdate();
      return {
        success: true,
        message: `Challenge Solved! +${chal.rewardScore} Points. Forensic Clue: "${chal.evidenceClue}"`,
        clue: chal.evidenceClue
      };
    } else {
      return { success: false, message: 'Incorrect solution. Inspect the clue and try again.' };
    }
  }

  // Submit Accusation
  submitAccusation(accusingTeamId, suspectTeamId, attachedEvidenceIds, indictmentNotes) {
    const accuser = this.teams.find(t => t.id === accusingTeamId);
    const suspect = this.teams.find(t => t.id === suspectTeamId);

    if (!accuser || !suspect) {
      return { success: false, message: 'Invalid accusation target.' };
    }

    if (accuser.id === suspect.id) {
      return { success: false, message: 'You cannot accuse your own team.' };
    }

    if (this.phase === 'DEFENCE_PHASE') {
      return { success: false, message: 'An accusation trial is already under way.' };
    }

    // Calculate initial confidence
    let confidence = 50 + (attachedEvidenceIds.length * 15);
    confidence = Math.min(confidence, 98);

    this.activeAccusation = {
      id: 'ACC-' + Date.now(),
      accusingTeamId: accuser.id,
      accusingTeamName: accuser.name,
      suspectTeamId: suspect.id,
      suspectTeamName: suspect.name,
      attachedEvidenceIds: attachedEvidenceIds || [],
      indictmentNotes: indictmentNotes || 'Forensic pattern correlation indicates malicious infiltration.',
      confidence,
      votesGuilty: 0,
      votesNotGuilty: 0,
      timestamp: new Date().toTimeString().split(' ')[0]
    };

    this.phase = 'DEFENCE_PHASE';
    this.timer = this.phaseDuration.DEFENCE_PHASE;
    this.defenseStatement = null;
    this.juryVotes = {};

    this.logSystem('INDICTMENT', 'TRIBUNAL', `EMERGENCY: Team ${accuser.id} formally accuses Team ${suspect.id} of HACKER INFILTRATION!`);
    this.emitStateUpdate();

    return { success: true, message: 'Indictment filed! Commencing 45-second Defence Phase.' };
  }

  // Set defense statement by the accused team
  setDefenseStatement(teamId, statement) {
    if (!this.activeAccusation || this.activeAccusation.suspectTeamId !== teamId) {
      return { success: false, message: 'Only the accused team can submit an official defense statement.' };
    }
    this.defenseStatement = statement;
    this.logSystem('DEFENSE_REBUTTAL', teamId, `Accused Team ${teamId} states: "${statement}"`);
    this.emitStateUpdate();
    return { success: true, message: 'Defense statement broadcasted to tribunal.' };
  }

  // Vote during defense phase
  castJuryVote(teamId, vote) { // vote: 'GUILTY' | 'NOT_GUILTY'
    if (this.phase !== 'DEFENCE_PHASE') return { success: false, message: 'Voting only open during Defence Phase.' };
    this.juryVotes[teamId] = vote;
    this.emitStateUpdate();
    return { success: true, message: `Vote recorded: ${vote}` };
  }

  // Resolve Accusation at end of defense phase
  resolveAccusation() {
    if (!this.activeAccusation) return;

    const suspect = this.teams.find(t => t.id === this.activeAccusation.suspectTeamId);
    const accuser = this.teams.find(t => t.id === this.activeAccusation.accusingTeamId);

    const isActuallyHacker = suspect && suspect.role === 'HACKER';

    this.phase = 'REVEAL_PHASE';
    this.timer = this.phaseDuration.REVEAL_PHASE;

    if (isActuallyHacker) {
      // Correct accusation
      accuser.score += this.scoringRules.CORRECT_HACKER_ACCUSATION;
      suspect.isEliminated = true;
      suspect.secretRevealed = true;
      this.revealResult = {
        success: true,
        suspectTeamId: suspect.id,
        suspectTeamName: suspect.name,
        actualRole: 'HACKER',
        penaltyMessage: `🚨 HACKER IDENTIFIED! Team ${suspect.id} quarantined. Accuser awarded +300 PTS.`
      };
      this.logSystem('VERDICT', 'TRIBUNAL', `GUILTY! Team ${suspect.id} confirmed as HACKER.`);
    } else {
      // False accusation
      accuser.score += this.scoringRules.FALSE_ACCUSATION_PENALTY;
      suspect.score += 50; // innocence compensation
      this.revealResult = {
        success: false,
        suspectTeamId: suspect.id,
        suspectTeamName: suspect.name,
        actualRole: 'CIVILIAN',
        penaltyMessage: `❌ FALSE ACCUSATION! Team ${suspect.id} is an innocent CIVILIAN. Accuser penalized -100 PTS.`
      };
      this.logSystem('VERDICT', 'TRIBUNAL', `ACQUITTED! Team ${suspect.id} is an innocent CIVILIAN.`);
    }

    this.emitStateUpdate();
  }

  // Add a system log
  logSystem(type, source, message) {
    const timestamp = new Date().toTimeString().split(' ')[0];
    const log = {
      id: 'LOG-' + (this.systemLogs.length + 1),
      timestamp,
      type,
      source,
      message
    };
    this.systemLogs.unshift(log);
    if (this.systemLogs.length > 200) this.systemLogs.pop();
  }

  // Add chat message
  addChatMessage({ senderTeamId, senderTeamName, channel, text, evidenceAttachment = null }) {
    const msg = {
      id: 'MSG-' + Date.now() + Math.random().toString(36).substring(7),
      timestamp: new Date().toTimeString().split(' ')[0],
      senderTeamId,
      senderTeamName,
      channel, // 'PUBLIC', 'TEAM', 'BROADCAST'
      text,
      evidenceAttachment
    };
    this.chatMessages.push(msg);
    if (this.chatMessages.length > 300) this.chatMessages.shift();
    this.emit('new_chat', msg);
    return msg;
  }

  // Generate safe state object for client based on player role
  getClientState(teamId, isAdmin = false) {
    const team = this.teams.find(t => t.id === teamId);
    const role = team ? team.role : 'SPECTATOR';

    // Mask secret roles of other teams unless revealed or isAdmin
    const sanitizedTeams = this.teams.map(t => {
      const isSelf = t.id === teamId;
      const isHackerAlly = role === 'HACKER' && t.role === 'HACKER';
      const showSecret = isAdmin || t.secretRevealed || isSelf || isHackerAlly;

      return {
        id: t.id,
        name: t.name,
        playersCount: t.players.length,
        integrity: t.integrity,
        isEliminated: t.isEliminated,
        secretRevealed: t.secretRevealed,
        role: showSecret ? t.role : 'UNKNOWN',
        modules: t.modules,
        suspicion: t.suspicion,
        score: t.score
      };
    });

    return {
      phase: this.phase,
      round: this.round,
      maxRounds: this.maxRounds,
      timer: this.timer,
      isPaused: this.isPaused,
      myTeam: team ? {
        ...team,
        visibleEvidence: this.evidenceManager.getVisibleEvidenceForTeam(teamId, isAdmin)
      } : null,
      teams: sanitizedTeams,
      hackerData: role === 'HACKER' || isAdmin ? {
        activeSpoof: this.activeSpoofs[teamId] || null,
        myFootprints: this.evidenceManager.getEvidenceForHacker(teamId)
      } : null,
      civilianLabChallenges: this.civilianLabChallenges.map(c => ({
        id: c.id,
        category: c.category,
        title: c.title,
        difficulty: c.difficulty,
        rewardScore: c.rewardScore,
        description: c.description,
        prompt: c.prompt,
        isSolved: c.solvedBy?.includes(teamId) || false
      })),
      systemLogs: this.systemLogs.slice(0, 50),
      activeAccusation: this.activeAccusation,
      defenseStatement: this.defenseStatement,
      juryVotesCount: Object.keys(this.juryVotes).length,
      revealResult: this.revealResult,
      scoringRules: this.scoringRules
    };
  }

  emitStateUpdate() {
    this.emit('state_update');
  }
}

module.exports = GameEngine;
