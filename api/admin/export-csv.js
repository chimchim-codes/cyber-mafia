// api/admin/export-csv.js
// Vercel Serverless Endpoint for Secure CSV Final Results Export (Phase 7)

const gameService = require('../../server/services/gameService');
const { verifyAdminAuthorization } = require('../../server/utils/auth');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-key, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const auth = verifyAdminAuthorization(req);
  if (!auth.authorized) {
    return res.status(auth.statusCode || 401).json({
      success: false,
      message: auth.message || 'Unauthorized: Valid x-admin-key header, Authorization: Bearer, or adminKey query parameter required to export final results.'
    });
  }

  const sessionId = req.query.sessionId || 'default-cyber-session';

  try {
    const { csvContent, filename, isProvisional, totalTeams } = await gameService.generateFinalResultsCsv(sessionId);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('X-Provisional-Results', isProvisional ? 'true' : 'false');
    res.setHeader('X-Total-Teams', totalTeams.toString());

    return res.status(200).send(csvContent);
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};
