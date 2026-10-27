// api/health.js
// Vercel Serverless Health Check Endpoint

const gameService = require('../server/services/gameService');
const { getDatabaseConfigStatus } = require('../server/db/supabaseClient');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const dbConfig = getDatabaseConfigStatus();

  try {
    const sessionId = req.query.sessionId || 'default-cyber-session';
    const session = await gameService.getOrCreateSession(sessionId);
    const timing = gameService.calculateElapsedTiming(session);

    return res.status(200).json({
      status: 'online',
      provider: 'Vercel Serverless + Supabase',
      database: {
        provider: dbConfig.provider,
        isMock: dbConfig.isMock,
        connected: true
      },
      config: {
        hasSupabaseUrl: dbConfig.hasSupabaseUrl,
        hasServiceRoleKey: dbConfig.hasServiceRoleKey,
        hasAnonKey: dbConfig.hasAnonKey,
        hasAdminSecretKey: dbConfig.hasAdminSecretKey
      },
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
      database: {
        provider: dbConfig.provider,
        isMock: dbConfig.isMock,
        connected: false
      },
      message: err.message
    });
  }
};
