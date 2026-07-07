const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveDispatchHospitalId, isDispatcherDispatchAllowed, shouldReleaseAmbulanceOnCancel } = require('../utils/dispatchRouting');

test('uses the auto-routed hospital for dispatch assignment', () => {
  const call = { assigned_hospital_id: 12 };
  assert.equal(resolveDispatchHospitalId(call), 12);
});

test('allows a dispatcher to act only on calls assigned to their own hospital', () => {
  assert.equal(isDispatcherDispatchAllowed({ assigned_hospital_id: 12 }, 12), true);
  assert.equal(isDispatcherDispatchAllowed({ assigned_hospital_id: 12 }, 34), false);
});

test('releases an ambulance when a cancelable dispatch exists', () => {
  assert.equal(shouldReleaseAmbulanceOnCancel({ ambulance_id: 7 }), true);
  assert.equal(shouldReleaseAmbulanceOnCancel(null), false);
});
