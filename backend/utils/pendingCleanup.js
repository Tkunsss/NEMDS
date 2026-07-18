const { pool } = require('../config/db');

function buildCleanupTargets(activeCallIds = [], dispatchRows = []) {
  const callIds = [...new Set(activeCallIds.filter(Boolean))];
  const ambulanceIds = [...new Set(dispatchRows.map((row) => row.ambulance_id).filter(Boolean))];
  return { callIds, ambulanceIds };
}

async function cleanupPendingCalls() {
  const [activeCallRows] = await pool.query(
    "SELECT call_id FROM emergency_calls WHERE status NOT IN ('completed', 'cancelled')"
  );
  const [dispatchRows] = await pool.query(
    `SELECT DISTINCT d.ambulance_id
     FROM dispatches d
     JOIN emergency_calls ec ON ec.call_id = d.call_id
     WHERE ec.status NOT IN ('completed', 'cancelled')`
  );

  const { callIds, ambulanceIds } = buildCleanupTargets(activeCallRows.map((row) => row.call_id), dispatchRows);

  if (callIds.length) {
    const callPlaceholders = callIds.map(() => '?').join(',');
    await pool.query(`UPDATE emergency_calls SET status = 'cancelled' WHERE call_id IN (${callPlaceholders})`, callIds);
  }

  if (ambulanceIds.length) {
    const ambulancePlaceholders = ambulanceIds.map(() => '?').join(',');
    await pool.query(`UPDATE ambulances SET status = 'available' WHERE ambulance_id IN (${ambulancePlaceholders})`, ambulanceIds);
  }

  return { cancelledCalls: callIds.length, releasedAmbulances: ambulanceIds.length };
}

module.exports = { buildCleanupTargets, cleanupPendingCalls };
