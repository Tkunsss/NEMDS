const test = require('node:test');
const assert = require('node:assert/strict');
const { countAvailableAmbulances } = require('../utils/ambulanceStats');

test('counts ambulances that are available and currently have a driver', () => {
  const ambulances = [
    { status: 'available', deleted_at: null, has_driver: true },
    { status: 'available', deleted_at: '2026-07-18 10:00:00', has_driver: true },
    { status: 'dispatched', deleted_at: null, has_driver: true },
    { status: 'available', deleted_at: null, has_driver: false },
    { status: 'out_of_service', deleted_at: null, has_driver: true }
  ];

  assert.equal(countAvailableAmbulances(ambulances), 1);
});
