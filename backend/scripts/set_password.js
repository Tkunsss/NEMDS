require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const { CAMBODIA_TIME_OFFSET } = require('../utils/time');

const PHONE = process.argv[2] || '1';
const NEW_PASS = process.argv[3] || 'Password123!';

(async () => {
  try {
    const ssl = process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined;
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      timezone: CAMBODIA_TIME_OFFSET,
      ssl
    });
    await conn.query(`SET time_zone = '${CAMBODIA_TIME_OFFSET}'`);

    const hash = await bcrypt.hash(NEW_PASS, 10);
    const [res] = await conn.execute('UPDATE users SET password_hash = ?, updated_at = NOW() WHERE phone_number = ?', [hash, PHONE]);
    console.log('Updated rows:', res.affectedRows);
    await conn.end();
  } catch (err) {
    console.error('Error setting password:', err.message);
    process.exit(1);
  }
})();
