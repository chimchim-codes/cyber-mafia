// api/admin/recovery.js
// Vercel Serverless Endpoint for Administrative Recovery Snapshots & Resets (Phase 6)

const gameService = require('../../server/services/gameService');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const adminKey = req.headers['x-admin-key'];
  const configuredAdminKey = process.env.ADMIN_SECRET_KEY || 'cyber-mafia-admin-secret-replace-in-production';

  if (adminKey !== configuredAdminKey) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Valid x-admin-key header required for administrative recovery operations.'
    });
  }

  const sessionId = (req.query.sessionId || req.body?.sessionId) || 'default-cyber-session';

  try {
    // GET: List snapshot history or audit logs
    if (req.method === 'GET') {
      const { teamId, levelId } = req.query;
      const snapshots = await gameService.getSnapshotHistory(sessionId, teamId, levelId ? parseInt(levelId) : null);
      return res.status(200).json({
        sessionId,
        teamId: teamId || null,
        levelId: levelId || null,
        snapshots
      });
    }

    // POST: Administrative recovery actions
    if (req.method === 'POST') {
      const { action, snapshotId, teamId, levelId, adminIdentity = 'SYSTEM_ADMIN', reason } = req.body || {};

      if (!reason) {
        return res.status(400).json({
          success: false,
          message: 'An explicit reason is mandatory for all administrative recovery and reset operations.'
        });
      }

      if (action === 'RESTORE_SNAPSHOT') {
        if (!snapshotId) {
          return res.status(400).json({ success: false, message: 'snapshotId is required' });
        }
        const result = await gameService.restoreSnapshot({
          sessionId,
          snapshotId,
          adminIdentity,
          reason
        });
        return res.status(200).json(result);
      }

      if (action === 'RESET_LEVEL') {
        if (!teamId || !levelId) {
          return res.status(400).json({ success: false, message: 'teamId and levelId are required' });
        }
        const resetProgress = await gameService.resetTeamLevel(
          sessionId,
          teamId,
          parseInt(levelId),
          adminIdentity,
          reason
        );
        return res.status(200).json({ success: true, resetProgress });
      }

      if (action === 'RESET_TEAM_ENTIRE') {
        if (!teamId) {
          return res.status(400).json({ success: false, message: 'teamId is required' });
        }
        const result = await gameService.resetTeamEntireProgress(
          sessionId,
          teamId,
          adminIdentity,
          reason
        );
        return res.status(200).json(result);
      }

      if (action === 'RECALCULATE_SCORE') {
        if (!teamId) {
          return res.status(400).json({ success: false, message: 'teamId is required' });
        }
        const newScore = await gameService.recalculateTeamScore(sessionId, teamId);
        await gameService.recordAuditLog({
          sessionId,
          adminIdentity,
          actionType: 'RECALCULATE_SCORE',
          targetTeamId: teamId,
          reason,
          resultingState: { score: newScore }
        });
        return res.status(200).json({ success: true, teamId, recalculatedScore: newScore });
      }

      return res.status(400).json({ success: false, message: `Unknown admin recovery action: ${action}` });
    }

    return res.status(405).json({ message: 'Method Not Allowed' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
