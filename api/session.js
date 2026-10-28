// api/session.js
// Vercel Serverless Endpoint for Game Session State & Joining Teams

const gameService = require('../server/services/gameService');
const { verifyAdminAuthorization } = require('../server/utils/auth');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-key, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Authorize admin status strictly without hardcoded fallback credentials
  const authResult = verifyAdminAuthorization(req);
  const isAdmin = authResult.authorized;

  try {
    if (req.method === 'GET') {
      const sessionId = req.query.sessionId || 'default-cyber-session';
      const teamId = req.query.teamId || null;

      const state = await gameService.getClientState(sessionId, teamId, isAdmin);
      return res.status(200).json(state);
    }

    if (req.method === 'POST') {
      const { action, sessionId = 'default-cyber-session', playerName, teamId, clientId, teamName, systemNo } = req.body || {};

      if (action === 'JOIN_TEAM') {
        if (!teamId) {
          return res.status(400).json({ success: false, message: 'teamId is required' });
        }
        const updatedTeam = await gameService.joinTeam(sessionId, playerName, teamId, clientId, { teamName, systemNo });
        const state = await gameService.getClientState(sessionId, teamId, isAdmin);
        return res.status(200).json({ success: true, team: updatedTeam, state });
      }

      if (action === 'HEARTBEAT') {
        if (!teamId) {
          return res.status(400).json({ success: false, message: 'teamId is required' });
        }
        const result = await gameService.recordHeartbeat(sessionId, teamId);
        return res.status(200).json(result);
      }

      if (action === 'RECONNECT') {
        if (!teamId) {
          return res.status(400).json({ success: false, message: 'teamId is required' });
        }
        const recon = await gameService.reconnectTeam(sessionId, teamId);
        const state = await gameService.getClientState(sessionId, teamId, isAdmin);
        return res.status(200).json({ success: true, reconnection: recon, state });
      }

      // Default: create or retrieve session
      const session = await gameService.getOrCreateSession(sessionId);
      const state = await gameService.getClientState(sessionId, teamId, isAdmin);
      return res.status(200).json({ success: true, session, state });
    }

    return res.status(405).json({ message: 'Method Not Allowed' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
