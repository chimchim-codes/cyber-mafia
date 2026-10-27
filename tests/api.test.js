const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const { app } = require('../server/server');

test('API Integration - Health check endpoint', async () => {
  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/health`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'healthy');
    assert.ok(data.service.includes('SupportHub'));
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
