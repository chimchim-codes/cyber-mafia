// api/health.js
// Vercel Serverless Health Check Endpoint

const gameService = require('../server/services/gameService');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const sessionId = req.query.sessionId || 'default-cyber-session';
    const session = await gameService.getOrCreateSession(sessionId);
    const timing = gameService.calculateElapsedTiming(session);

    return res.status(200).json({
      status: 'online',
      provider: 'Vercel Serverless + Supabase',
      sessionId: session.id,
      sessionStatus: session.status,
      currentPhase: session.current_phase,
      currentRound: session.current_round,
      isPaused: session.is_paused,
      timing,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    return res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
};
