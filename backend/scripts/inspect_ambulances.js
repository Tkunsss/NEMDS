require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
  try {
    const ssl = process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined;
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl
    });

    const [ambs] = await conn.execute(`SELECT ambulance_id, plate_number, vehicle_type, home_hospital_id, status, current_latitude, current_longitude, last_location_update FROM ambulances ORDER BY ambulance_id ASC`);
    console.log('Ambulances:');
    console.log(JSON.stringify(ambs, null, 2));

    const [dispatches] = await conn.execute(`SELECT d.*, c.call_id AS call_call_id, c.status AS call_status FROM dispatches d LEFT JOIN calls c ON c.call_id = d.call_id WHERE d.completed_at IS NULL ORDER BY d.dispatched_at DESC`);
    console.log('Active dispatches (not completed):');
    console.log(JSON.stringify(dispatches, null, 2));

    await conn.end();
  } catch (err) {
    console.error('Error inspecting ambulances:', err.message);
    process.exit(1);
  }
})();
