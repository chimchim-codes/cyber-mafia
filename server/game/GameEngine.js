// server/game/GameEngine.js
// Core Game Engine for Dr. Adrian Vale Murder Mystery & Cyber Forensics

const EventEmitter = require('events');
const crypto = require('crypto');
const os = require('os');
const fs = require('fs');
const path = require('path');
const { INVESTIGATION_LOCATIONS, generateHackerChallenge, generateCivilianLabChallenges } = require('./challenges');
const EvidenceManager = require('./evidence');
const BotAI = require('./botAI');

class GameEngine extends EventEmitter {
  constructor() {
    super();
    this.phase = 'LOBBY';
    this.round = 1;
    this.maxRounds = 5;
    this.timer = 120;
    this.phaseDuration = {
      HACKER_PHASE: 90,
      CIVILIAN_PHASE: 150,
      DEFENCE_PHASE: 45,
      REVEAL_PHASE: 25,
      ROLE_ASSIGNMENT: 10
    };
    this.isPaused = false;
    this.timerInterval = null;

    // Start timestamp
    this.startTime = new Date();

    // Teams / Suspects collection
    this.teams = [];
    this.hackerCount = 1;
    this.totalTeamsCount = 8;

    // Systems
    this.evidenceManager = new EvidenceManager();
    this.botAI = new BotAI(this);

    // Locations and CTF Lab Challenges
    this.locations = INVESTIGATION_LOCATIONS;
    this.civilianLabChallenges = generateCivilianLabChallenges();

    // Active hacker attack challenges
    this.activeAttackChallenges = {};

    // System Logs
    this.systemLogs = [];

    // Chat messages
    this.chatMessages = [];

    // Active Accusation and Verdict State
    this.activeAccusation = null;
    this.defenseStatement = null;
    this.juryVotes = {};
    this.revealResult = null;

    // Deception modifiers
    this.activeSpoofs = {};
    this.disabledCivilianModules = {};

    // Scoring Rules
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

  // Initialize suspects and investigator teams
  initDefaultTeams(count = 8, hackers = 1) {
    this.totalTeamsCount = count;
    this.hackerCount = hackers;
    this.teams = [];

    const suspects = [
      { id: 'C01', suspectId: 'S01', name: 'Dr. Mira Sen', role: 'CIVILIAN', title: 'Senior Research Fellow' },
      { id: 'C02', suspectId: 'S02', name: 'Noah Mercer', role: 'CIVILIAN', title: 'Systems Architect' },
      { id: 'C03', suspectId: 'S03', name: 'Felix Grant', role: 'CIVILIAN', title: 'Security Lead' },
      { id: 'C04', suspectId: 'S04', name: 'Elena Ward', role: 'HACKER', title: 'Director of Operations (The Killer)' },
      { id: 'C05', suspectId: 'S05', name: 'Inspector Cross', role: 'CIVILIAN', title: 'Lead Investigator' },
      { id: 'C06', suspectId: 'S06', name: 'Agent Vance', role: 'CIVILIAN', title: 'Forensic Analyst' },
      { id: 'C07', suspectId: 'S07', name: 'Officer Blake', role: 'CIVILIAN', title: 'Field Security' },
      { id: 'C08', suspectId: 'S08', name: 'Sentinel Unit', role: 'CIVILIAN', title: 'Automated Defense' }
    ];

    for (let i = 0; i < count; i++) {
      const s = suspects[i] || {
        id: (i < 9 ? 'C0' : 'C') + (i + 1),
        suspectId: (i < 9 ? 'S0' : 'S') + (i + 1),
        name: `Agent ${i + 1}`,
        role: 'CIVILIAN',
        title: 'Investigator'
      };
      this.teams.push({
        id: s.id,
        suspectId: s.suspectId,
        name: s.name,
        title: s.title,
        players: [],
        role: s.role,
        secretRevealed: false,
        integrity: 100,
        score: 0,
        isBot: true,
        isEliminated: false,
        hintsUsedPerLocation: {},
        totalHintsUsed: 0,
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

    this.logSystem('INITIALIZE', 'SYSTEM', `Investigation active with ${count} squads/suspects.`);
  }

  // Join or assign a player to a team
  joinTeam(socketId, playerName, teamId) {
    this.teams.forEach(t => {
      t.players = t.players.filter(p => p.socketId !== socketId);
      if (t.players.length === 0) {
        t.isBot = true;
      }
    });

    let targetTeam = this.teams.find(t => 
      t.id === teamId || 
      t.suspectId === teamId ||
      t.id.toLowerCase() === teamId?.toLowerCase() ||
      (teamId?.startsWith('S') && t.id === 'C' + teamId.slice(1)) ||
      (teamId?.startsWith('C') && t.id === 'S' + teamId.slice(1))
    );
    if (!targetTeam) {
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

  removePlayer(socketId) {
    this.teams.forEach(t => {
      t.players = t.players.filter(p => p.socketId !== socketId);
      if (t.players.length === 0) {
        t.isBot = true;
      }
    });
    this.emitStateUpdate();
  }

  startGame() {
    this.startTime = new Date();
    this.phase = 'ROLE_ASSIGNMENT';
    this.round = 1;
    this.assignSecretRoles();
    this.timer = this.phaseDuration.ROLE_ASSIGNMENT;
    this.botAI.start();

    this.logSystem('GAME_START', 'CORE', `Murder investigation commenced at ${this.startTime.toLocaleTimeString()}.`);
    this.startTimer();
    this.emitStateUpdate();
  }

  assignSecretRoles() {
    // Elena Ward is canonical killer
    this.teams.forEach(t => {
      t.integrity = 100;
      t.secretRevealed = false;
      t.isEliminated = false;
      t.hintsUsedPerLocation = {};
      t.totalHintsUsed = 0;
      t.role = t.name.includes('Elena') ? 'HACKER' : 'CIVILIAN';
    });
  }

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
  }

  advancePhase() {
    if (this.phase === 'ROLE_ASSIGNMENT') {
      this.phase = 'CIVILIAN_PHASE';
      this.timer = this.phaseDuration.CIVILIAN_PHASE;
      this.logSystem('PHASE_CHANGE', 'GLOBAL', `Forensic Investigation Phase active.`);
    } else if (this.phase === 'CIVILIAN_PHASE') {
      this.evaluateRoundSurvival();
      if (this.round >= this.maxRounds) {
        this.endGame();
        return;
      }
      this.round++;
      this.phase = 'CIVILIAN_PHASE';
      this.timer = this.phaseDuration.CIVILIAN_PHASE;
      this.logSystem('ROUND_START', 'GLOBAL', `Round ${this.round} begins.`);
    } else if (this.phase === 'DEFENCE_PHASE') {
      this.resolveAccusation();
    } else if (this.phase === 'REVEAL_PHASE') {
      this.activeAccusation = null;
      this.defenseStatement = null;
      this.juryVotes = {};
      this.phase = 'CIVILIAN_PHASE';
      this.timer = 120;
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

  endGame() {
    this.phase = 'GAME_OVER';
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.botAI.stop();
    this.logSystem('GAME_OVER', 'CORE', `Investigation concluded.`);
    this.emitStateUpdate();
  }

  // Location Hint: 1 per location, 3 per whole game
  requestLocationHint(teamId, locationId) {
    const team = this.teams.find(t => 
      t.id === teamId || 
      t.suspectId === teamId || 
      (teamId?.startsWith('S') && t.id === 'C' + teamId.slice(1))
    ) || this.teams[0];
    if (!team) return { success: false, message: 'Team not found.' };

    if (!team.hintsUsedPerLocation) team.hintsUsedPerLocation = {};
    if (team.totalHintsUsed === undefined) team.totalHintsUsed = 0;

    if (team.hintsUsedPerLocation[locationId]) {
      return { success: false, message: 'Only 1 hint allowed per location.' };
    }

    if (team.totalHintsUsed >= 3) {
      return { success: false, message: 'Limit reached: Maximum 3 hints allowed per whole game.' };
    }

    const loc = this.locations.find(l => l.id === locationId);
    if (!loc) return { success: false, message: 'Location not found.' };

    team.hintsUsedPerLocation[locationId] = true;
    team.totalHintsUsed += 1;

    this.logSystem('HINT', team.id, `Hint unlocked for ${loc.name}. Hints remaining: ${3 - team.totalHintsUsed}/3`);
    this.emitStateUpdate();

    return {
      success: true,
      hint: loc.hint,
      locationId: loc.id,
      locationName: loc.name,
      totalHintsUsed: team.totalHintsUsed,
      hintsRemaining: 3 - team.totalHintsUsed
    };
  }

  // Solve Civilian CTF Lab Challenge
  solveCivilianChallenge(teamId, challengeId, answer) {
    const team = this.teams.find(t => 
      t.id === teamId || 
      t.suspectId === teamId || 
      (teamId?.startsWith('S') && t.id === 'C' + teamId.slice(1))
    ) || this.teams[0];
    const chal = this.civilianLabChallenges.find(c => c.id === challengeId);

    if (!team || !chal) {
      return { success: false, message: 'Challenge not found.' };
    }

    if (chal.solvedBy && chal.solvedBy.includes(team.id)) {
      return { success: false, message: 'Challenge already solved by your squad.' };
    }

    const isCorrect = (answer || '').trim().toLowerCase() === (chal.expected || '').trim().toLowerCase();

    if (isCorrect) {
      if (!chal.solvedBy) chal.solvedBy = [];
      chal.solvedBy.push(team.id);
      team.score += chal.rewardScore || 75;

      this.logSystem('FORENSIC_SOLVE', team.id, `Solved [${chal.title}]. Clue unlocked.`);

      const clueText = chal.evidenceClue || chal.unlockSummary || 'Evidence batch unlocked';
      this.evidenceManager.evidenceList.forEach(ev => {
        this.evidenceManager.enhanceEvidence(ev.id, team.id, clueText);
      });

      this.emitStateUpdate();
      return {
        success: true,
        message: `Challenge Solved! +${chal.rewardScore} PTS. Clue unlocked: "${clueText}"`,
        clue: clueText
      };
    } else {
      return { success: false, message: 'Incorrect answer. Check the prompt or request a hint.' };
    }
  }

  // Write start and stop timestamps directly to desktop
  writeDesktopTimestamp(teamName, teamId, answers, score, isSolved) {
    const startTime = this.startTime || new Date(Date.now() - 600000);
    const stopTime = new Date();
    const diffSec = Math.max(0, Math.round((stopTime.getTime() - startTime.getTime()) / 1000));
    const mins = Math.floor(diffSec / 60);
    const secs = diffSec % 60;
    const durationStr = `${mins}m ${secs}s (${diffSec} seconds)`;

    const q5Text = Array.isArray(answers.q5) ? answers.q5.sort().join(', ') : (answers.q5 || 'None');
    const isQ1 = answers.q1 === 'D';
    const isQ2 = answers.q2 === 'A';
    const isQ3 = answers.q3 === 'B';
    const isQ4 = answers.q4 === 'D' || answers.q4 === 'C';
    const isQ5 = Array.isArray(answers.q5) && ['A', 'B', 'C', 'D'].every(o => answers.q5.includes(o)) && answers.q5.length === 4;

    const report = [
      `======================================================================`,
      `  INIT ASSOCIATION: FALSE TRIALS - HIGH TRIBUNAL RECORD               `,
      `======================================================================`,
      `Investigator / Team : ${teamName || 'Investigator'} (${teamId || 'SOLO'})`,
      `Verdict             : ${isSolved ? 'CASE SOLVED - ELENA WARD GUILTY AS CHARGED' : 'INCORRECT ACCUSATION'}`,
      `Score               : ${score} / 5 Questions Correct`,
      `----------------------------------------------------------------------`,
      `TIMESTAMPS:`,
      `  STARTED AT        : ${startTime.toLocaleString()} [${startTime.toISOString()}]`,
      `  STOPPED AT        : ${stopTime.toLocaleString()} [${stopTime.toISOString()}]`,
      `  TOTAL DURATION    : ${durationStr}`,
      `----------------------------------------------------------------------`,
      `ACCUSATION MCQ SUBMISSIONS:`,
      `  1. Killer         : ${answers.q1 || 'None'} -> Elena Ward (${isQ1 ? 'CORRECT' : 'WRONG'})`,
      `  2. Method/Weapon  : ${answers.q2 || 'None'} -> Poison administered through a drink (${isQ2 ? 'CORRECT' : 'WRONG'})`,
      `  3. Motive         : ${answers.q3 || 'None'} -> Preventing Adrian from exposing unauthorized exports (${isQ3 ? 'CORRECT' : 'WRONG'})`,
      `  4. Accomplice     : ${answers.q4 || 'None'} -> No accomplice established (${isQ4 ? 'CORRECT' : 'WRONG'})`,
      `  5. Evidence       : [${q5Text}] -> TOX-102, MEM-501, WIT-503, BIO-602 (${isQ5 ? 'CORRECT' : 'WRONG'})`,
      `======================================================================`,
      `Generated at: ${new Date().toISOString()}`
    ].join('\n');

    console.log('\n' + report + '\n');

    try {
      const desktopDir = path.join(os.homedir(), 'Desktop');
      if (fs.existsSync(desktopDir)) {
        fs.writeFileSync(path.join(desktopDir, 'accusation_timestamp.txt'), report, 'utf8');
        fs.writeFileSync(path.join(desktopDir, 'timestamp.txt'), report, 'utf8');
        console.log(`[DESKTOP] Written successfully: ${path.join(desktopDir, 'accusation_timestamp.txt')}`);
      }
    } catch (err) {
      console.warn(`[DESKTOP WARNING] Could not write directly to Desktop: ${err.message}`);
    }

    try {
      fs.writeFileSync(path.join(__dirname, '../../accusation_timestamp.txt'), report, 'utf8');
    } catch (err) {
      // ignore
    }

    return {
      startTime: startTime.toISOString(),
      stopTime: stopTime.toISOString(),
      startTimeStr: startTime.toLocaleTimeString(),
      stopTimeStr: stopTime.toLocaleTimeString(),
      durationStr,
      diffSec,
      reportText: report
    };
  }

  // Submit MCQ Accusation
  // Answer key: 1-D, 2-A, 3-B, 4-D, 5-A/B/C/D
  submitMCQAccusation(accusingTeamId, answers) {
    const accuser = this.teams.find(t => 
      t.id === accusingTeamId || 
      t.suspectId === accusingTeamId || 
      (accusingTeamId?.startsWith('S') && t.id === 'C' + accusingTeamId.slice(1))
    ) || this.teams[0];

    const isQ1 = answers?.q1 === 'D';
    const isQ2 = answers?.q2 === 'A';
    const isQ3 = answers?.q3 === 'B';
    const isQ4 = answers?.q4 === 'D';
    const q5Arr = Array.isArray(answers?.q5) ? answers.q5 : [];
    const isQ5 = ['A', 'B', 'C', 'D'].every(o => q5Arr.includes(o)) && q5Arr.length === 4;

    const score = (isQ1 ? 1 : 0) + (isQ2 ? 1 : 0) + (isQ3 ? 1 : 0) + (isQ4 ? 1 : 0) + (isQ5 ? 1 : 0);
    const isSolved = isQ1 && isQ2 && isQ3 && isQ4 && isQ5;

    const tsInfo = this.writeDesktopTimestamp(accuser.name, accuser.id, answers || {}, score, isSolved);

    if (isSolved) {
      accuser.score += 500;
      const elena = this.teams.find(t => t.name.includes('Elena'));
      if (elena) {
        elena.isEliminated = true;
        elena.secretRevealed = true;
      }
      this.logSystem('INDICTMENT', 'TRIBUNAL', `CASE SOLVED! Elena Ward convicted of Dr. Adrian Vale's murder. +500 PTS.`);
    } else {
      accuser.score = Math.max(0, accuser.score - 50);
      this.logSystem('INDICTMENT', 'TRIBUNAL', `ACCUSATION FAILED: ${score}/5 correct. Penalized -50 PTS.`);
    }

    this.phase = 'REVEAL_PHASE';
    this.timer = 30;

    this.revealResult = {
      success: isSolved,
      isSolved,
      score,
      totalQuestions: 5,
      suspectTeamName: 'Elena Ward',
      suspectTeamId: 'C04',
      actualRole: 'KILLER',
      penaltyMessage: isSolved
        ? `🚨 MURDER SOLVED! Elena Ward convicted of murdering Dr. Adrian Vale! +500 PTS awarded.`
        : `❌ ACCUSATION INCORRECT: ${score}/5 questions correct. Review forensic evidence and try again.`,
      timestampInfo: tsInfo
    };

    this.emitStateUpdate();
    return {
      success: true,
      isSolved,
      score,
      totalQuestions: 5,
      timestampInfo: tsInfo,
      revealResult: this.revealResult
    };
  }

  // Traditional squad accusation (used in standard Mafia indictment)
  submitAccusation(accusingTeamId, suspectTeamId, attachedEvidenceIds = [], indictmentNotes = '') {
    const accuser = this.teams.find(t => 
      t.id === accusingTeamId || 
      t.suspectId === accusingTeamId || 
      (accusingTeamId?.startsWith('S') && t.id === 'C' + accusingTeamId.slice(1))
    ) || this.teams[0];
    const suspect = this.teams.find(t => 
      t.id === suspectTeamId || 
      t.suspectId === suspectTeamId || 
      (suspectTeamId?.startsWith('S') && t.id === 'C' + suspectTeamId.slice(1))
    );

    if (!accuser || !suspect) {
      return { success: false, message: 'Invalid accusation target.' };
    }

    if (accuser.id === suspect.id) {
      return { success: false, message: 'You cannot accuse your own team.' };
    }

    if (this.phase === 'DEFENCE_PHASE') {
      return { success: false, message: 'An accusation trial is already under way.' };
    }

    this.activeAccusation = {
      id: 'ACC-' + Date.now(),
      accusingTeamId: accuser.id,
      accusingTeamName: accuser.name,
      suspectTeamId: suspect.id,
      suspectTeamName: suspect.name,
      attachedEvidenceIds: attachedEvidenceIds || [],
      indictmentNotes: indictmentNotes || 'Formal accusation filed in tribunal.',
      confidence: Math.min(50 + (attachedEvidenceIds.length * 15), 98),
      votesGuilty: 0,
      votesNotGuilty: 0,
      timestamp: new Date().toTimeString().split(' ')[0]
    };

    this.phase = 'DEFENCE_PHASE';
    this.timer = this.phaseDuration.DEFENCE_PHASE;
    this.defenseStatement = null;
    this.juryVotes = {};

    this.logSystem('INDICTMENT', 'TRIBUNAL', `EMERGENCY: Team ${accuser.id} accuses Team ${suspect.id}!`);
    this.emitStateUpdate();

    return { success: true, message: 'Indictment filed! Commencing 45-second Defence Phase.' };
  }

  resolveAccusation() {
    if (!this.activeAccusation) return;

    const suspect = this.teams.find(t => t.id === this.activeAccusation.suspectTeamId);
    const accuser = this.teams.find(t => t.id === this.activeAccusation.accusingTeamId);

    const isActuallyHacker = suspect && suspect.role === 'HACKER';

    this.phase = 'REVEAL_PHASE';
    this.timer = this.phaseDuration.REVEAL_PHASE;

    if (isActuallyHacker) {
      accuser.score += this.scoringRules.CORRECT_HACKER_ACCUSATION || 300;
      suspect.isEliminated = true;
      suspect.secretRevealed = true;
      this.revealResult = {
        success: true,
        isSolved: true,
        suspectTeamId: suspect.id,
        suspectTeamName: suspect.name,
        actualRole: 'HACKER',
        penaltyMessage: `🚨 HACKER IDENTIFIED! Team ${suspect.id} (${suspect.name}) quarantined. Accuser awarded +300 PTS.`
      };
      this.logSystem('VERDICT', 'TRIBUNAL', `GUILTY! Team ${suspect.id} confirmed as HACKER.`);
    } else {
      accuser.score += this.scoringRules.FALSE_ACCUSATION_PENALTY || -100;
      if (suspect) suspect.score += 50;
      this.revealResult = {
        success: false,
        isSolved: false,
        suspectTeamId: suspect ? suspect.id : 'UNKNOWN',
        suspectTeamName: suspect ? suspect.name : 'Unknown',
        actualRole: 'CIVILIAN',
        penaltyMessage: `❌ FALSE ACCUSATION! Team ${suspect ? suspect.id : ''} is an innocent CIVILIAN. Accuser penalized -100 PTS.`
      };
      this.logSystem('VERDICT', 'TRIBUNAL', `ACQUITTED! Team ${suspect ? suspect.id : ''} is an innocent CIVILIAN.`);
    }

    this.emitStateUpdate();
  }

  setDefenseStatement(teamId, statement) {
    this.defenseStatement = statement;
    this.emitStateUpdate();
    return { success: true };
  }

  castJuryVote(teamId, vote) {
    this.juryVotes[teamId] = vote;
    this.emitStateUpdate();
    return { success: true };
  }

  // Generate Attack Challenge (for Hacker role)
  generateAttackChallenge(attackerTeamId, targetTeamId, attackType) {
    const attacker = this.teams.find(t => t.id === attackerTeamId);
    const target = this.teams.find(t => t.id === targetTeamId);
    if (!attacker || !target) return null;

    const chal = generateHackerChallenge(attackType, target, attacker);
    if (chal) {
      this.activeAttackChallenges[chal.id] = { ...chal, attackerTeamId, targetTeamId };
    }
    return chal;
  }

  submitAttackSolution(attackerTeamId, challengeId, solution) {
    const chal = this.activeAttackChallenges[challengeId];
    if (!chal) return { success: false, message: 'Challenge expired.' };

    const attacker = this.teams.find(t => t.id === attackerTeamId);
    const target = this.teams.find(t => t.id === chal.targetTeamId);
    const isCorrect = (solution || '').trim() === chal.expectedSolution;

    if (isCorrect) {
      attacker.score += 100;
      target.integrity = Math.max(0, target.integrity - 20);
      if (target.modules) {
        target.modules.evidenceVault = 'DISABLED';
      }
      this.evidenceManager.createAttackEvidence({
        attackerTeam: attacker,
        targetTeam: target,
        attackType: chal.type,
        signature: chal.signature,
        moduleAffected: 'evidenceVault'
      });
      delete this.activeAttackChallenges[challengeId];
      this.emitStateUpdate();
      return { success: true, message: 'Target compromised! +100 PTS' };
    } else {
      attacker.score -= 25;
      this.emitStateUpdate();
      return { success: false, message: 'Payload rejected.' };
    }
  }

  useDeception(teamId, abilityType, payload) {
    const team = this.teams.find(t => t.id === teamId);
    if (!team || team.role !== 'HACKER') return { success: false, message: 'Unauthorized.' };
    team.score += 50;
    this.emitStateUpdate();
    return { success: true, message: `${abilityType} ability executed.` };
  }

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
    if (this.systemLogs.length > 100) this.systemLogs.pop();
  }

  addChatMessage({ senderTeamId, senderTeamName, channel, text, evidenceAttachment = null }) {
    const msg = {
      id: 'MSG-' + Date.now() + Math.random().toString(36).substring(7),
      timestamp: new Date().toTimeString().split(' ')[0],
      senderTeamId,
      senderTeamName,
      channel,
      text,
      evidenceAttachment
    };
    this.chatMessages.push(msg);
    if (this.chatMessages.length > 200) this.chatMessages.shift();
    this.emit('new_chat', msg);
    return msg;
  }

  getClientState(teamId, isAdmin = false) {
    const team = this.teams.find(t => 
      t.id === teamId || 
      t.suspectId === teamId || 
      (teamId?.startsWith('S') && t.id === 'C' + teamId.slice(1))
    );
    const role = team ? team.role : 'SPECTATOR';

    const sanitizedTeams = this.teams.map(t => {
      const isSelf = t.id === teamId || t.suspectId === teamId;
      const isHackerAlly = role === 'HACKER' && t.role === 'HACKER';
      const showSecret = isAdmin || t.secretRevealed || isSelf || isHackerAlly;

      return {
        id: t.id,
        suspectId: t.suspectId,
        name: t.name,
        title: t.title,
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

    const totalHints = team ? (team.totalHintsUsed || 0) : 0;

    return {
      phase: this.phase,
      round: this.round,
      maxRounds: this.maxRounds,
      timer: this.timer,
      isPaused: this.isPaused,
      startTime: this.startTime ? this.startTime.toISOString() : new Date().toISOString(),
      hintsRemaining: Math.max(0, 3 - totalHints),
      hintsUsedPerLocation: team ? (team.hintsUsedPerLocation || {}) : {},
      locations: this.locations,
      myTeam: team ? {
        ...team,
        visibleEvidence: this.evidenceManager.getVisibleEvidenceForTeam(team.id, isAdmin)
      } : null,
      teams: sanitizedTeams,
      hackerData: role === 'HACKER' || isAdmin ? {
        activeSpoof: this.activeSpoofs[team?.id] || null,
        myFootprints: this.evidenceManager.getEvidenceForHacker(team?.id)
      } : null,
      civilianLabChallenges: this.civilianLabChallenges.map(c => ({
        id: c.id,
        locationId: c.locationId,
        locationName: c.locationName,
        room: c.room,
        category: c.category,
        title: c.title,
        difficulty: c.difficulty,
        rewardScore: c.rewardScore,
        description: c.description,
        prompt: c.prompt,
        clueId: c.clueId,
        isSolved: c.solvedBy?.includes(team?.id) || false
      })),
      systemLogs: this.systemLogs.slice(0, 40),
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
