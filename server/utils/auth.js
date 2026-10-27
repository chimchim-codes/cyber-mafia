// server/utils/auth.js
// Authoritative Administrative Authorization Utility for CYBER MAFIA

const crypto = require('crypto');

/**
 * Validates the administrative key from request headers or query parameters.
 * Uses timingSafeEqual to prevent timing attacks.
 * Rejects requests if ADMIN_SECRET_KEY is not configured on the server.
 *
 * @param {object} req - HTTP request object (Vercel Serverless or Express)
 * @returns {{ authorized: boolean, statusCode?: number, message?: string }}
 */
function verifyAdminAuthorization(req) {
  const configuredKey = process.env.ADMIN_SECRET_KEY;

  if (!configuredKey || configuredKey.trim() === '') {
    return {
      authorized: false,
      statusCode: 500,
      code: 'NOT_CONFIGURED',
      message: 'Server security misconfiguration: ADMIN_SECRET_KEY is not configured on the server. Administrative operations are disabled.'
    };
  }

  // Look for key in:
  // 1. x-admin-key header
  // 2. x-admin-token header
  // 3. Authorization: Bearer <key> header
  // 4. adminKey query parameter (used for direct browser downloads like CSV export)
  // 5. adminKey in request body
  const headers = req.headers || {};
  const headerKey = headers['x-admin-key'] || headers['x-admin-token'];
  
  let bearerKey = null;
  const authHeader = headers['authorization'] || headers['Authorization'];
  if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    bearerKey = authHeader.slice(7).trim();
  }

  const query = req.query || {};
  const queryKey = query.adminKey || query.admin_key;

  const body = req.body || {};
  const bodyKey = typeof body === 'object' && body !== null ? (body.adminKey || body.admin_key) : null;

  const providedKey = headerKey || bearerKey || queryKey || bodyKey;

  if (!providedKey || typeof providedKey !== 'string') {
    return {
      authorized: false,
      statusCode: 401,
      code: 'MISSING_KEY',
      message: 'Unauthorized: Valid administrative key required in x-admin-key header, Authorization: Bearer header, or adminKey parameter.'
    };
  }

  // Prevent timing attacks using crypto.timingSafeEqual
  const configuredBuf = Buffer.from(configuredKey.trim());
  const providedBuf = Buffer.from(providedKey.trim());

  if (configuredBuf.length !== providedBuf.length) {
    return {
      authorized: false,
      statusCode: 403,
      code: 'INVALID_KEY',
      message: 'Forbidden: Invalid administrative key.'
    };
  }

  const isValid = crypto.timingSafeEqual(configuredBuf, providedBuf);
  if (!isValid) {
    return {
      authorized: false,
      statusCode: 403,
      code: 'INVALID_KEY',
      message: 'Forbidden: Invalid administrative key.'
    };
  }

  return { authorized: true };
}

module.exports = {
  verifyAdminAuthorization
};
