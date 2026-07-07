require('dotenv').config();
const mysql = require('mysql2/promise');

const PHONE = process.argv[2] || '1';
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

    const [rows] = await conn.execute('SELECT * FROM users WHERE phone_number = ? LIMIT 1', [PHONE]);
    console.log(JSON.stringify(rows[0] || null, null, 2));
    await conn.end();
  } catch (err) {
    console.error('Error querying user:', err.message);
    process.exit(1);
  }
})();
