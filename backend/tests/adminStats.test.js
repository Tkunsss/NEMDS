const test = require('node:test');
const assert = require('node:assert/strict');
const { countAvailableAmbulances } = require('../utils/ambulanceStats');

test('counts ambulances that are currently available and not deleted', () => {
  const ambulances = [
    { status: 'available', deleted_at: null },
    { status: 'available', deleted_at: '2026-07-18 10:00:00' },
    { status: 'dispatched', deleted_at: null },
    { status: 'available', deleted_at: null },
    { status: 'out_of_service', deleted_at: null }
  ];

  assert.equal(countAvailableAmbulances(ambulances), 2);
});
