// server/server.js
// Express + Socket.io Server for CYBER MAFIA with Vercel API Endpoints Adapter
require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const GameEngine = require('./game/GameEngine');
const setupSocketHandlers = require('./sockets/gameHandlers');
const { getDatabaseConfigStatus } = require('./db/supabaseClient');

// Vercel Serverless API Handlers
const healthHandler = require('../api/health');
const sessionHandler = require('../api/session');
const leaderboardHandler = require('../api/leaderboard');
const gameActionHandler = require('../api/game-action');
const recoveryHandler = require('../api/admin/recovery');
const exportCsvHandler = require('../api/admin/export-csv');
const adminAuthHandler = require('../api/admin/auth');

const app = express();
const server = http.createServer(app);

// CORS for local development and LAN
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-admin-key', 'Authorization']
}));

app.use(express.json());

// Helper adapter for Vercel Serverless Function signature
const adaptVercelHandler = (handler) => async (req, res, next) => {
  try {
    await handler(req, res);
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: err.message });
    } else {
      next(err);
    }
  }
};

// Mount Vercel-compatible API routes
app.all('/api/health', adaptVercelHandler(healthHandler));
app.all('/api/session', adaptVercelHandler(sessionHandler));
app.all('/api/leaderboard', adaptVercelHandler(leaderboardHandler));
app.all('/api/game-action', adaptVercelHandler(gameActionHandler));
app.all('/api/admin/recovery', adaptVercelHandler(recoveryHandler));
app.all('/api/admin/export-csv', adaptVercelHandler(exportCsvHandler));
app.all('/api/admin/auth', adaptVercelHandler(adminAuthHandler));

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Initialize master GameEngine (for local socket fallback)
const gameEngine = new GameEngine();
setupSocketHandlers(io, gameEngine);

// Quick debug endpoint to get server state
app.get('/api/state', (req, res) => {
  res.json(gameEngine.getClientState(null, true));
});

// Endpoint to write timestamp to desktop
app.post('/api/record-timestamp', (req, res) => {
  const { teamName, teamId, answers, score, isSolved } = req.body || {};
  const result = gameEngine.writeDesktopTimestamp(teamName, teamId, answers || {}, score || 0, !!isSolved);
  res.json({ success: true, result });
});

// Serve frontend build if available
const clientDistPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientDistPath));

// Fallback for SPA routing in Express
app.use((req, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'), (err) => {
    if (err) {
      res.status(200).send('Cyber Mafia Server Online. Run Vite client with npm run client.');
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  const dbStatus = getDatabaseConfigStatus();
  console.log(`===========================================`);
  console.log(`🛡️  CYBER MAFIA Server running on port ${PORT}`);
  console.log(`💾 Database: ${dbStatus.provider} (${dbStatus.isMock ? 'IN-MEMORY' : 'REMOTE'})`);
  console.log(`🌐 API ready at http://localhost:${PORT}/api/health`);
  console.log(`===========================================`);
});
