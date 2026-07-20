const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizePhotoData } = require('../utils/photoData');

test('normalizePhotoData preserves realistic image payloads', () => {
  const photoData = 'data:image/jpeg;base64,' + 'a'.repeat(20000);
  assert.equal(normalizePhotoData(photoData), photoData);
});

test('normalizePhotoData rejects oversized payloads', () => {
  const oversized = 'data:image/jpeg;base64,' + 'b'.repeat(8 * 1024 * 1024 + 1);
  assert.equal(normalizePhotoData(oversized), null);
});

test('normalizePhotoData ignores blank input', () => {
  assert.equal(normalizePhotoData('   '), null);
  assert.equal(normalizePhotoData(null), null);
});
