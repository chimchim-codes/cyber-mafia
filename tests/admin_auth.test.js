// tests/admin_auth.test.js
// Tests for Administrative Authorization & Endpoint Protection (Phase 6 Security)

const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { verifyAdminAuthorization } = require('../server/utils/auth');
const gameActionHandler = require('../api/game-action');
const recoveryHandler = require('../api/admin/recovery');
const exportCsvHandler = require('../api/admin/export-csv');
const adminAuthHandler = require('../api/admin/auth');

describe('Security: Administrative Authorization & Endpoint Protection', () => {
  const ORIGINAL_ENV = process.env.ADMIN_SECRET_KEY;
  const TEST_SECRET = 'cyber-mafia-test-admin-secret-key-12345';

  beforeEach(() => {
    process.env.ADMIN_SECRET_KEY = TEST_SECRET;
    process.env.CYBER_MAFIA_USE_MOCK_DB = 'true';
  });

  afterEach(() => {
    if (ORIGINAL_ENV !== undefined) {
      process.env.ADMIN_SECRET_KEY = ORIGINAL_ENV;
    } else {
      delete process.env.ADMIN_SECRET_KEY;
    }
  });

  test('Rejects with 500 if ADMIN_SECRET_KEY is not configured on server', () => {
    delete process.env.ADMIN_SECRET_KEY;
    const req = { headers: { 'x-admin-key': TEST_SECRET } };
    const result = verifyAdminAuthorization(req);

    assert.equal(result.authorized, false);
    assert.equal(result.statusCode, 500);
    assert.match(result.message, /not configured/i);
  });

  test('Rejects with 401 if no administrative key is provided', () => {
    const req = { headers: {} };
    const result = verifyAdminAuthorization(req);

    assert.equal(result.authorized, false);
    assert.equal(result.statusCode, 401);
  });

  test('Rejects with 403 if incorrect key is provided', () => {
    const req = { headers: { 'x-admin-key': 'wrong-secret-key' } };
    const result = verifyAdminAuthorization(req);

    assert.equal(result.authorized, false);
    assert.equal(result.statusCode, 403);
  });

  test('Accepts valid key from x-admin-key header', () => {
    const req = { headers: { 'x-admin-key': TEST_SECRET } };
    const result = verifyAdminAuthorization(req);

    assert.equal(result.authorized, true);
  });

  test('Accepts valid key from Authorization Bearer header', () => {
    const req = { headers: { authorization: `Bearer ${TEST_SECRET}` } };
    const result = verifyAdminAuthorization(req);

    assert.equal(result.authorized, true);
  });

  test('Accepts valid key from adminKey query parameter for CSV export', () => {
    const req = { headers: {}, query: { adminKey: TEST_SECRET } };
    const result = verifyAdminAuthorization(req);

    assert.equal(result.authorized, true);
  });

  test('api/admin/auth returns 200 with authenticated: true for valid key', async () => {
    let responseStatus = null;
    let responseBody = null;

    const req = {
      method: 'POST',
      headers: { 'x-admin-key': TEST_SECRET }
    };
    const res = {
      setHeader: () => {},
      status: (code) => {
        responseStatus = code;
        return {
          json: (data) => { responseBody = data; return res; },
          end: () => res
        };
      }
    };

    await adminAuthHandler(req, res);
    assert.equal(responseStatus, 200);
    assert.equal(responseBody.success, true);
    assert.equal(responseBody.authenticated, true);
  });

  test('api/admin/auth returns 403 for incorrect key', async () => {
    let responseStatus = null;
    let responseBody = null;

    const req = {
      method: 'POST',
      headers: { 'x-admin-key': 'invalid-password' }
    };
    const res = {
      setHeader: () => {},
      status: (code) => {
        responseStatus = code;
        return {
          json: (data) => { responseBody = data; return res; },
          end: () => res
        };
      }
    };

    await adminAuthHandler(req, res);
    assert.equal(responseStatus, 403);
    assert.equal(responseBody.authenticated, false);
    assert.match(responseBody.message, /invalid/i);
  });

  test('api/admin/auth returns 401 when key is missing', async () => {
    let responseStatus = null;
    let responseBody = null;

    const req = {
      method: 'POST',
      headers: {}
    };
    const res = {
      setHeader: () => {},
      status: (code) => {
        responseStatus = code;
        return {
          json: (data) => { responseBody = data; return res; },
          end: () => res
        };
      }
    };

    await adminAuthHandler(req, res);
    assert.equal(responseStatus, 401);
    assert.equal(responseBody.authenticated, false);
  });

  test('api/admin/auth returns 500 when server has no key configured', async () => {
    delete process.env.ADMIN_SECRET_KEY;
    let responseStatus = null;
    let responseBody = null;

    const req = {
      method: 'POST',
      headers: { 'x-admin-key': TEST_SECRET }
    };
    const res = {
      setHeader: () => {},
      status: (code) => {
        responseStatus = code;
        return {
          json: (data) => { responseBody = data; return res; },
          end: () => res
        };
      }
    };

    await adminAuthHandler(req, res);
    assert.equal(responseStatus, 500);
    assert.equal(responseBody.code, 'NOT_CONFIGURED');
  });

  test('api/game-action rejects START_GAME without admin key', async () => {
    let responseStatus = null;
    let responseBody = null;

    const req = {
      method: 'POST',
      headers: {},
      body: { action: 'START_GAME', sessionId: 'test-auth-session' }
    };
    const res = {
      setHeader: () => {},
      status: (code) => {
        responseStatus = code;
        return {
          json: (data) => { responseBody = data; return res; },
          end: () => res
        };
      }
    };

    await gameActionHandler(req, res);
    assert.equal(responseStatus, 401);
    assert.equal(responseBody.success, false);
  });

  test('api/game-action rejects START_GAME with invalid admin key', async () => {
    let responseStatus = null;
    let responseBody = null;

    const req = {
      method: 'POST',
      headers: { 'x-admin-key': 'wrong-key-attempt' },
      body: { action: 'START_GAME', sessionId: 'test-auth-invalid' }
    };
    const res = {
      setHeader: () => {},
      status: (code) => {
        responseStatus = code;
        return {
          json: (data) => { responseBody = data; return res; },
          end: () => res
        };
      }
    };

    await gameActionHandler(req, res);
    assert.equal(responseStatus, 403);
    assert.equal(responseBody.success, false);
  });

  test('api/game-action rejects START_GAME with 500 if server key is not configured', async () => {
    delete process.env.ADMIN_SECRET_KEY;
    let responseStatus = null;
    let responseBody = null;

    const req = {
      method: 'POST',
      headers: { 'x-admin-key': TEST_SECRET },
      body: { action: 'START_GAME', sessionId: 'test-auth-unconfigured' }
    };
    const res = {
      setHeader: () => {},
      status: (code) => {
        responseStatus = code;
        return {
          json: (data) => { responseBody = data; return res; },
          end: () => res
        };
      }
    };

    await gameActionHandler(req, res);
    assert.equal(responseStatus, 500);
    assert.equal(responseBody.code, 'NOT_CONFIGURED');
  });

  test('api/game-action allows START_GAME with valid admin key', async () => {
    let responseStatus = null;
    let responseBody = null;

    const req = {
      method: 'POST',
      headers: { 'x-admin-key': TEST_SECRET },
      body: { action: 'START_GAME', sessionId: 'test-auth-start' }
    };
    const res = {
      setHeader: () => {},
      status: (code) => {
        responseStatus = code;
        return {
          json: (data) => { responseBody = data; return res; },
          end: () => res
        };
      }
    };

    await gameActionHandler(req, res);
    assert.equal(responseStatus, 200);
    assert.equal(responseBody.success, true);
  });

  test('api/game-action rejects PAUSE_GAME without admin key', async () => {
    let responseStatus = null;
    let responseBody = null;

    const req = {
      method: 'POST',
      headers: {},
      body: { action: 'PAUSE_GAME', sessionId: 'test-auth-pause' }
    };
    const res = {
      setHeader: () => {},
      status: (code) => {
        responseStatus = code;
        return {
          json: (data) => { responseBody = data; return res; },
          end: () => res
        };
      }
    };

    await gameActionHandler(req, res);
    assert.equal(responseStatus, 401);
  });

  test('api/game-action rejects RESUME_GAME without admin key', async () => {
    let responseStatus = null;
    let responseBody = null;

    const req = {
      method: 'POST',
      headers: {},
      body: { action: 'RESUME_GAME', sessionId: 'test-auth-resume' }
    };
    const res = {
      setHeader: () => {},
      status: (code) => {
        responseStatus = code;
        return {
          json: (data) => { responseBody = data; return res; },
          end: () => res
        };
      }
    };

    await gameActionHandler(req, res);
    assert.equal(responseStatus, 401);
  });

  test('api/game-action rejects END_GAME without admin key', async () => {
    let responseStatus = null;
    let responseBody = null;

    const req = {
      method: 'POST',
      headers: {},
      body: { action: 'END_GAME', sessionId: 'test-auth-end' }
    };
    const res = {
      setHeader: () => {},
      status: (code) => {
        responseStatus = code;
        return {
          json: (data) => { responseBody = data; return res; },
          end: () => res
        };
      }
    };

    await gameActionHandler(req, res);
    assert.equal(responseStatus, 401);
  });

  test('api/admin/recovery rejects unauthorized request', async () => {
    let responseStatus = null;
    let responseBody = null;

    const req = {
      method: 'GET',
      headers: { 'x-admin-key': 'invalid-key' },
      query: { sessionId: 'test-auth-recovery' }
    };
    const res = {
      setHeader: () => {},
      status: (code) => {
        responseStatus = code;
        return {
          json: (data) => { responseBody = data; return res; },
          end: () => res
        };
      }
    };

    await recoveryHandler(req, res);
    assert.equal(responseStatus, 403);
    assert.equal(responseBody.success, false);
  });

  test('api/admin/export-csv rejects unauthorized request', async () => {
    let responseStatus = null;
    let responseBody = null;

    const req = {
      method: 'GET',
      headers: {},
      query: { sessionId: 'test-auth-csv' }
    };
    const res = {
      setHeader: () => {},
      status: (code) => {
        responseStatus = code;
        return {
          json: (data) => { responseBody = data; return res; },
          send: (data) => { responseBody = data; return res; },
          end: () => res
        };
      }
    };

    await exportCsvHandler(req, res);
    assert.equal(responseStatus, 401);
    assert.equal(responseBody.success, false);
  });
});
