// server/sockets/gameHandlers.js
// Socket.io event controllers and role-based data broadcasting

function setupSocketHandlers(io, gameEngine) {
  // Broadcast state changes with role-tailored sanitization
  function broadcastGameState() {
    const sockets = io.sockets.sockets;
    sockets.forEach((sock) => {
      const teamId = sock.data.teamId;
      const isAdmin = sock.data.isAdmin || false;
      const state = gameEngine.getClientState(teamId, isAdmin);
      sock.emit('game_state_update', state);
    });
  }

  // Subscribe to internal game engine events
  gameEngine.on('state_update', () => {
    broadcastGameState();
  });

  gameEngine.on('timer_tick', (data) => {
    io.emit('timer_tick', data);
  });

  gameEngine.on('new_chat', (msg) => {
    io.emit('chat_message', msg);
  });

  io.on('connection', (socket) => {
    // Player joins or identifies
    socket.on('join_lobby', ({ playerName, teamId, isAdmin }) => {
      socket.data.playerName = playerName;
      socket.data.isAdmin = isAdmin || false;

      let assignedTeam = null;
      if (teamId) {
        assignedTeam = gameEngine.joinTeam(socket.id, playerName, teamId);
        socket.data.teamId = assignedTeam ? assignedTeam.id : null;
      }

      // Send initial state
      const state = gameEngine.getClientState(socket.data.teamId, socket.data.isAdmin);
      socket.emit('game_state_update', state);
      socket.emit('joined_team_success', { team: assignedTeam, isAdmin: socket.data.isAdmin });
    });

    // Start Game (Admin or Host)
    socket.on('start_game', () => {
      gameEngine.startGame();
    });

    // Request Hacker Challenge
    socket.on('request_attack_challenge', ({ targetTeamId, attackType }) => {
      const teamId = socket.data.teamId;
      const challenge = gameEngine.generateAttackChallenge(teamId, targetTeamId, attackType);
      if (challenge) {
        socket.emit('attack_challenge_ready', challenge);
      } else {
        socket.emit('action_error', { message: 'Cannot launch attack. Check phase and role authorization.' });
      }
    });

    // Submit Hacker Attack Solution
    socket.on('submit_attack_solution', ({ challengeId, solution }) => {
      const teamId = socket.data.teamId;
      const result = gameEngine.submitAttackSolution(teamId, challengeId, solution);
      socket.emit('attack_result', result);
    });

    // Hacker Deception Ability
    socket.on('use_deception_ability', ({ abilityType, payload }) => {
      const teamId = socket.data.teamId;
      const result = gameEngine.useDeception(teamId, abilityType, payload);
      socket.emit('deception_result', result);
    });

    // Solve Civilian CTF Lab
    socket.on('solve_civilian_challenge', ({ challengeId, answer }) => {
      const teamId = socket.data.teamId;
      const result = gameEngine.solveCivilianChallenge(teamId, challengeId, answer);
      socket.emit('ctf_lab_result', result);
    });

    // File Accusation
    socket.on('submit_accusation', ({ suspectTeamId, attachedEvidenceIds, notes }) => {
      const teamId = socket.data.teamId;
      const result = gameEngine.submitAccusation(teamId, suspectTeamId, attachedEvidenceIds, notes);
      if (!result.success) {
        socket.emit('action_error', { message: result.message });
      }
    });

    // Submit Defense Statement
    socket.on('submit_defense_statement', ({ statement }) => {
      const teamId = socket.data.teamId;
      const result = gameEngine.setDefenseStatement(teamId, statement);
      socket.emit('defense_result', result);
    });

    // Cast Jury Vote
    socket.on('cast_jury_vote', ({ vote }) => {
      const teamId = socket.data.teamId;
      const result = gameEngine.castJuryVote(teamId, vote);
      socket.emit('vote_recorded', result);
    });

    // Send Chat
    socket.on('send_chat_message', ({ channel, text, evidenceAttachment }) => {
      const teamId = socket.data.teamId;
      const team = gameEngine.teams.find(t => t.id === teamId);
      gameEngine.addChatMessage({
        senderTeamId: teamId || 'SPECTATOR',
        senderTeamName: team ? team.name : (socket.data.playerName || 'Operator'),
        channel: channel || 'PUBLIC',
        text,
        evidenceAttachment
      });
    });

    // Admin Controls
    socket.on('admin_action', ({ action, payload }) => {
      if (!socket.data.isAdmin) {
        socket.emit('action_error', { message: 'Admin privileges required.' });
        return;
      }

      switch (action) {
        case 'PAUSE_RESUME':
          gameEngine.isPaused = !gameEngine.isPaused;
          gameEngine.emitStateUpdate();
          break;
        case 'FORCE_PHASE':
          if (payload?.phase) {
            gameEngine.phase = payload.phase;
            gameEngine.timer = gameEngine.phaseDuration[payload.phase] || 60;
            gameEngine.emitStateUpdate();
          }
          break;
        case 'RECONFIGURE_TEAMS':
          gameEngine.initDefaultTeams(payload.count || 8, payload.hackers || 2);
          gameEngine.emitStateUpdate();
          break;
        case 'REVEAL_ALL':
          gameEngine.teams.forEach(t => t.secretRevealed = true);
          gameEngine.emitStateUpdate();
          break;
        case 'RESET_GAME':
          gameEngine.phase = 'LOBBY';
          gameEngine.initDefaultTeams(gameEngine.totalTeamsCount, gameEngine.hackerCount);
          gameEngine.emitStateUpdate();
          break;
        case 'TOGGLE_BOTS':
          if (gameEngine.botAI.isActive) {
            gameEngine.botAI.stop();
          } else {
            gameEngine.botAI.start();
          }
          gameEngine.logSystem('ADMIN', 'SERVER', `Bot AI status toggled: ${gameEngine.botAI.isActive}`);
          gameEngine.emitStateUpdate();
          break;
        case 'INJECT_ATTACK':
          // Admin can trigger a simulated compromise for testing
          if (payload.targetTeamId) {
            const target = gameEngine.teams.find(t => t.id === payload.targetTeamId);
            if (target) {
              const dummyAttacker = gameEngine.teams.find(t => t.role === 'HACKER') || { id: 'H01', name: 'Phantom Root' };
              target.integrity = Math.max(0, target.integrity - 20);
              target.modules.evidenceVault = 'DISABLED';
              gameEngine.evidenceManager.createAttackEvidence({
                attackerTeam: dummyAttacker,
                targetTeam: target,
                attackType: 'COOKIE_SHIFT',
                signature: 'CS-04',
                route: '/api/v1/session',
                moduleAffected: 'evidenceVault'
              });
              gameEngine.logSystem('ADMIN_INJECT', 'OVERRIDE', `Simulated attack injected into ${target.id}`);
              gameEngine.emitStateUpdate();
            }
          }
          break;
      }
    });

    socket.on('disconnect', () => {
      gameEngine.removePlayer(socket.id);
    });
  });
}

module.exports = setupSocketHandlers;
