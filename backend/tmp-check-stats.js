require('dotenv').config();
const { pool } = require('./config/db');

(async () => {
  try {
    const queries = [
      'SELECT COUNT(*) AS total_users FROM users',
      'SELECT COUNT(*) AS total_hospitals FROM hospitals',
      'SELECT COUNT(*) AS total_calls FROM emergency_calls',
      "SELECT COUNT(*) AS active_calls FROM emergency_calls WHERE status IN ('pending', 'assigned', 'en_route', 'on_scene', 'transporting')",
      'SELECT COUNT(*) AS total_ambulances FROM ambulances',
      "SELECT COUNT(*) AS available_ambulances FROM ambulances WHERE status = 'available'",
      "SELECT COUNT(*) AS total_dispatchers FROM users WHERE role = 'dispatcher'",
      "SELECT COUNT(*) AS total_drivers FROM users WHERE role = 'driver'"
    ];

    for (const sql of queries) {
      const [rows] = await pool.query(sql);
      console.log(sql, '=>', JSON.stringify(rows));
    }
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
