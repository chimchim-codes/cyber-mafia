const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

test('Auth Unit - Password hashing and verification', async () => {
  const plainPassword = 'SecurePassword2026!';
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(plainPassword, salt);

  assert.notEqual(plainPassword, hash);
  const isMatch = await bcrypt.compare(plainPassword, hash);
  assert.equal(isMatch, true);

  const isWrongMatch = await bcrypt.compare('WrongPassword!', hash);
  assert.equal(isWrongMatch, false);
});

test('Auth Unit - JWT token signing and verification', () => {
  const secret = 'test_secret_key_123';
  const payload = { id: 'user_123', email: 'agent@test.com', role: 'agent' };

  const token = jwt.sign(payload, secret, { expiresIn: '1h' });
  assert.ok(typeof token === 'string');

  const decoded = jwt.verify(token, secret);
  assert.equal(decoded.id, 'user_123');
  assert.equal(decoded.email, 'agent@test.com');
  assert.equal(decoded.role, 'agent');
});
