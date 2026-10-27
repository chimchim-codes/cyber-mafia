// server/game/botAI.js
// Autonomous Bot Simulation Engine for realistic gameplay testing and solo play

class BotAI {
  constructor(gameEngine) {
    this.gameEngine = gameEngine;
    this.interval = null;
    this.isActive = false;
  }

  start() {
    if (this.interval) clearInterval(this.interval);
    this.isActive = true;
    this.interval = setInterval(() => this.tick(), 7000);
    if (this.interval && this.interval.unref) {
      this.interval.unref();
    }
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.isActive = false;
  }

  tick() {
    if (!this.isActive || !this.gameEngine || this.gameEngine.phase === 'LOBBY' || this.gameEngine.phase === 'GAME_OVER' || this.gameEngine.isPaused) {
      return;
    }

    const { phase, teams } = this.gameEngine;

    // Hacker phase bot logic
    if (phase === 'HACKER_PHASE') {
      const hackerBots = teams.filter(t => t.role === 'HACKER' && t.isBot && !t.isEliminated);
      const civilianTargets = teams.filter(t => t.role === 'CIVILIAN' && !t.isEliminated);

      if (hackerBots.length > 0 && civilianTargets.length > 0) {
        // Random bot hacker initiates an attack
        const randomHacker = hackerBots[Math.floor(Math.random() * hackerBots.length)];
        const randomTarget = civilianTargets[Math.floor(Math.random() * civilianTargets.length)];
        const attackTypes = ['COOKIE_SHIFT', 'TOKEN_HUNT', 'ROUTE_BREAK', 'PACKET_DECODE'];
        const chosenAttack = attackTypes[Math.floor(Math.random() * attackTypes.length)];

        // Hacker bot generates and solves challenge after short delay
        const chal = this.gameEngine.generateAttackChallenge(randomHacker.id, randomTarget.id, chosenAttack);
        if (chal) {
          setTimeout(() => {
            if (this.gameEngine.phase === 'HACKER_PHASE') {
              this.gameEngine.submitAttackSolution(randomHacker.id, chal.id, chal.expectedSolution);
            }
          }, 3500);
        }
      }
    }

    // Civilian phase bot logic: solve CTF or participate in chat
    if (phase === 'CIVILIAN_PHASE') {
      const civilianBots = teams.filter(t => t.role === 'CIVILIAN' && t.isBot && !t.isEliminated);
      if (civilianBots.length > 0) {
        const randomCivilian = civilianBots[Math.floor(Math.random() * civilianBots.length)];
        
        // Civilian bot periodically solves an unlocked lab challenge
        const unsolved = this.gameEngine.civilianLabChallenges.filter(c => !c.solvedBy?.includes(randomCivilian.id));
        if (unsolved.length > 0 && Math.random() < 0.4) {
          const chal = unsolved[0];
          this.gameEngine.solveCivilianChallenge(randomCivilian.id, chal.id, chal.expected);
        }

        // Civilian bot occasionally drops a deduction chat message
        if (Math.random() < 0.25) {
          const chatPhrases = [
            `Team ${randomCivilian.id} detected unusual ingress on port 8080!`,
            `We noticed an anomalous session modification around recent minutes.`,
            `Comparing timestamps with server access logs... Anyone else see Node activity?`,
            `Our network monitor caught an auth token fragment leak!`,
            `Check the Log Analyzer, there's a signature pattern matching recent node spikes.`
          ];
          const text = chatPhrases[Math.floor(Math.random() * chatPhrases.length)];
          this.gameEngine.addChatMessage({
            senderTeamId: randomCivilian.id,
            senderTeamName: randomCivilian.name,
            channel: 'PUBLIC',
            text
          });
        }
      }
    }

    // Defence Phase bot voting / statements
    if (phase === 'DEFENCE_PHASE') {
      const { activeAccusation } = this.gameEngine;
      if (activeAccusation && !activeAccusation.botSpoke) {
        activeAccusation.botSpoke = true;
        const accusedTeam = teams.find(t => t.id === activeAccusation.suspectTeamId);
        if (accusedTeam && accusedTeam.isBot) {
          setTimeout(() => {
            const defenseStatements = [
              `This is an unverified spoof! Our node was operating nominal diagnostics at that time.`,
              `Check the signature mismatch! Our telemetry logs prove we were offline during that event.`,
              `We have zero reason to attack our own sector. Look at the real node discrepancy!`
            ];
            const rebuttal = defenseStatements[Math.floor(Math.random() * defenseStatements.length)];
            this.gameEngine.setDefenseStatement(accusedTeam.id, rebuttal);
          }, 4000);
        }
      }
    }
  }
}

module.exports = BotAI;
