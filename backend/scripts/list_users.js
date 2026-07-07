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

    const [rows] = await conn.execute('SELECT user_id, full_name, phone_number, email, role, is_active, created_at FROM users ORDER BY created_at DESC LIMIT 20');
    console.log(JSON.stringify(rows, null, 2));
    await conn.end();
  } catch (err) {
    console.error('Error querying users:', err.message);
    process.exit(1);
  }
})();
