// api/admin/auth.js
// Vercel Serverless Endpoint for Admin Authentication Verification

const { verifyAdminAuthorization } = require('../../server/utils/auth');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-key, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const auth = verifyAdminAuthorization(req);
  if (!auth.authorized) {
    return res.status(auth.statusCode || 401).json({
      success: false,
      authenticated: false,
      code: auth.code || 'UNAUTHORIZED',
      message: auth.message || 'Unauthorized: Valid administrative key required.'
    });
  }

  return res.status(200).json({
    success: true,
    authenticated: true,
    message: 'Admin authorization verified successfully.'
  });
};
