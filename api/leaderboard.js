// api/leaderboard.js
// Vercel Serverless Endpoint for Live Authoritative Leaderboard

const gameService = require('../server/services/gameService');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const sessionId = req.query.sessionId || 'default-cyber-session';
    const session = await gameService.getOrCreateSession(sessionId);
    const leaderboard = await gameService.getLeaderboard(sessionId);
    const timing = gameService.calculateElapsedTiming(session);

    return res.status(200).json({
      sessionId,
      sessionStatus: session.status,
      isPaused: session.is_paused,
      timing,
      leaderboard,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};
