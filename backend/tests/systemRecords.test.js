const test = require('node:test');
const assert = require('node:assert/strict');
const { buildSystemRecords } = require('../utils/systemRecords');

test('buildSystemRecords maps calls and status history into the admin records shape', () => {
  const calls = [
    {
      call_id: 101,
      emergency_id: 'EMG-001',
      caller_phone: '0712345678',
      emergency_type: 'medical',
      status: 'assigned',
      description: 'Chest pain',
      address_text: 'Nairobi',
      assigned_hospital_id: 3,
      created_at: '2026-07-07 09:00:00'
    }
  ];

  const logsByCall = {
    101: [
      { log_id: 1, status: 'pending', note: 'Submitted', created_at: '2026-07-07 08:58:00' },
      { log_id: 2, status: 'assigned', note: 'Auto-routed', created_at: '2026-07-07 09:00:00' }
    ]
  };

  const records = buildSystemRecords(calls, logsByCall);

  assert.equal(records.length, 1);
  assert.equal(records[0].call_id, 101);
  assert.equal(records[0].timeline.length, 2);
  assert.equal(records[0].timeline[1].status, 'assigned');
  assert.equal(records[0].caller_phone, '0712345678');
  assert.equal(records[0].assigned_hospital_id, 3);
});
