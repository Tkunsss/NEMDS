// config/db.js
// MySQL connection pool using mysql2/promise

const mysql = require('mysql2/promise');
const fs = require('fs');
const { CAMBODIA_TIME_OFFSET } = require('../utils/time');
require('dotenv').config();

// Managed providers like Aiven require SSL by default. Set DB_SSL=true in
// .env to enable it. If you have Aiven's CA certificate downloaded, point
// DB_SSL_CA_PATH at it for proper certificate verification — otherwise this
// falls back to encrypting the connection without verifying the CA (fine for
// development, not recommended for production).
const sslConfig = (() => {
  if (process.env.DB_SSL !== 'true') return undefined;

  let ca;
  if (process.env.DB_SSL_CA_PATH) {
    try {
      ca = fs.readFileSync(process.env.DB_SSL_CA_PATH);
      console.log(`Using SSL CA from ${process.env.DB_SSL_CA_PATH}`);
    } catch (err) {
      console.warn(`DB_SSL_CA_PATH set but file not found at ${process.env.DB_SSL_CA_PATH}. Continuing without CA verification.`);
      ca = undefined;
    }
  }

  return {
    ca,
    rejectUnauthorized: false
  };
})();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3307,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ncemds',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true,
  timezone: CAMBODIA_TIME_OFFSET,
  ssl: sslConfig
});

pool.on('connection', (connection) => {
  connection.query(`SET time_zone = '${CAMBODIA_TIME_OFFSET}'`, (err) => {
    if (err) console.warn('Failed to set MySQL Cambodia time zone:', err.message);
  });
});

// Quick sanity check you can call on server startup
async function testConnection() {
  try {
    const conn = await pool.getConnection();
    console.log('✅ MySQL connected successfully');
    conn.release();
  } catch (err) {
    console.error('❌ MySQL connection failed:', {
      message: err.message,
      code: err.code,
      errno: err.errno,
      sqlState: err.sqlState,
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      ssl: process.env.DB_SSL
    });
  }
}

module.exports = { pool, testConnection };
