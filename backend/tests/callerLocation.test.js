const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveCallerLocation } = require('../utils/callerLocation');

test('prefers the latest ping when present', () => {
  const call = { latitude: 11.55, longitude: 104.92, created_at: '2024-01-01T00:00:00.000Z' };
  const latest = { latitude: 11.56, longitude: 104.93, created_at: '2024-01-01T00:01:00.000Z' };

  assert.deepEqual(resolveCallerLocation(call, latest), latest);
});

test('falls back to the confirmed call location when no ping exists', () => {
  const call = { latitude: 11.55, longitude: 104.92, created_at: '2024-01-01T00:00:00.000Z' };

  assert.deepEqual(resolveCallerLocation(call, null), {
    latitude: 11.55,
    longitude: 104.92,
    created_at: '2024-01-01T00:00:00.000Z'
  });
});
