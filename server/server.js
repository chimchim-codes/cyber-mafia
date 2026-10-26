// server/server.js
// Express + Socket.io Server for CYBER MAFIA

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const GameEngine = require('./game/GameEngine');
const setupSocketHandlers = require('./sockets/gameHandlers');

const app = express();
const server = http.createServer(app);

// CORS for local development and LAN
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST']
}));

app.use(express.json());

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Initialize master GameEngine
const gameEngine = new GameEngine();

// Attach Socket Handlers
setupSocketHandlers(io, gameEngine);

// Health check API
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    gamePhase: gameEngine.phase,
    round: gameEngine.round,
    teamsCount: gameEngine.teams.length,
    activeAccusation: !!gameEngine.activeAccusation
  });
});

// Quick debug endpoint to get server state
app.get('/api/state', (req, res) => {
  res.json(gameEngine.getClientState(null, true));
});

// Serve frontend build if available
const clientDistPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientDistPath));

// Fallback for SPA routing in Express 5
app.use((req, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'), (err) => {
    if (err) {
      res.status(200).send('Cyber Mafia Server Online. Run Vite development client or build client.');
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`===========================================`);
  console.log(`🛡️  CYBER MAFIA Server running on port ${PORT}`);
  console.log(`🌐 API ready at http://localhost:${PORT}/api/health`);
  console.log(`===========================================`);
});
