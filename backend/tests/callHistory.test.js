const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveCallListScope } = require('../utils/callHistory');

test('maps history status requests to the hospital history scope', () => {
  assert.deepEqual(resolveCallListScope('history'), { kind: 'history' });
});

test('keeps active and pending scopes distinct', () => {
  assert.deepEqual(resolveCallListScope('active'), { kind: 'active' });
  assert.deepEqual(resolveCallListScope('pending'), { kind: 'pending' });
});
