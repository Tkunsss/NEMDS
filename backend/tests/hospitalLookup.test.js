const test = require('node:test');
const assert = require('node:assert/strict');
const { buildRouteNote } = require('../controllers/callController');

test('buildRouteNote still works when no hospitals are available', () => {
  const note = buildRouteNote({ assigned_hospital_id: null, nearest: null, allHospitals: [] });
  assert.equal(note, 'Could not auto-route — no hospitals available');
});
