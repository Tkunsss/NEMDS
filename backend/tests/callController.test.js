const test = require('node:test');
const assert = require('node:assert/strict');
const { buildRouteNote } = require('../controllers/callController');

test('buildRouteNote returns a fallback message when no hospital with coordinates can be selected', () => {
  const note = buildRouteNote({ assigned_hospital_id: null, nearest: null, allHospitals: [{ hospital_id: 1, name: 'General Hospital' }] });
  assert.equal(note, 'Could not auto-route to a hospital with coordinates; routed using fallback');
});

test('buildRouteNote uses the nearest hospital name when one is available', () => {
  const note = buildRouteNote({ assigned_hospital_id: 7, nearest: { hospital_id: 7, name: 'St. Mary' }, allHospitals: [{ hospital_id: 7, name: 'St. Mary' }] });
  assert.equal(note, 'Routed to St. Mary');
});

test('buildRouteNote avoids crashing when a hospital exists but has no usable name', () => {
  const note = buildRouteNote({ assigned_hospital_id: 7, nearest: { hospital_id: 7 }, allHospitals: [{ hospital_id: 7 }] });
  assert.equal(note, 'Could not auto-route to a hospital with coordinates; routed using fallback');
});
