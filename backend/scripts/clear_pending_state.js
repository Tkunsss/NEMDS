const { pool } = require('../config/db');

async function main() {
  const [activeCallRows] = await pool.query(
    "SELECT call_id FROM emergency_calls WHERE status NOT IN ('completed', 'cancelled')"
  );
  const callIds = activeCallRows.map((row) => row.call_id);

  if (callIds.length) {
    const callPlaceholders = callIds.map(() => '?').join(',');
    await pool.query(`UPDATE emergency_calls SET status = 'cancelled' WHERE call_id IN (${callPlaceholders})`, callIds);
  }

  const [dispatchRows] = await pool.query(
    "SELECT DISTINCT ambulance_id FROM dispatches d JOIN emergency_calls ec ON ec.call_id = d.call_id WHERE ec.status NOT IN ('completed', 'cancelled')"
  );
  const ambulanceIds = dispatchRows.map((row) => row.ambulance_id).filter(Boolean);

  if (ambulanceIds.length) {
    const ambulancePlaceholders = ambulanceIds.map(() => '?').join(',');
    await pool.query(`UPDATE ambulances SET status = 'available' WHERE ambulance_id IN (${ambulancePlaceholders})`, ambulanceIds);
  }

  const [remainingRows] = await pool.query(
    "SELECT COUNT(*) AS remaining FROM emergency_calls WHERE status NOT IN ('completed', 'cancelled')"
  );

  console.log(JSON.stringify({
    stoppedCalls: callIds.length,
    releasedAmbulances: ambulanceIds.length,
    remainingActiveCalls: remainingRows[0].remaining
  }));

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
