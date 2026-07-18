const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const {
  CAMBODIA_TIME_OFFSET,
  formatCambodiaDateTime,
  formatCambodiaSqlDateTime,
  formatCambodiaTimestampForFile
} = require('../utils/time');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

function quoteIdentifier(identifier) {
  return `\`${String(identifier).replace(/`/g, '``')}\``;
}

function formatValue(value) {
  if (value === null || value === undefined) return 'NULL';
  if (Buffer.isBuffer(value)) return `X'${value.toString('hex')}'`;
  if (value instanceof Date) {
    return mysql.escape(formatCambodiaSqlDateTime(value));
  }
  return mysql.escape(value);
}

async function main() {
  let connection;
  const backupDir = path.join(__dirname, '..', 'backups');
  fs.mkdirSync(backupDir, { recursive: true });

  const now = new Date();
  const stamp = formatCambodiaTimestampForFile(now);
  const database = process.env.DB_NAME || 'ncemds';
  const outputPath = path.join(backupDir, `${database}-backup-${stamp}.sql`);

  const ssl =
    process.env.DB_SSL === 'true'
      ? {
          ca:
            process.env.DB_SSL_CA_PATH && fs.existsSync(path.resolve(__dirname, '..', process.env.DB_SSL_CA_PATH))
              ? fs.readFileSync(path.resolve(__dirname, '..', process.env.DB_SSL_CA_PATH))
              : undefined,
          rejectUnauthorized: false,
        }
      : undefined;

  connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3307),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database,
    dateStrings: true,
    timezone: CAMBODIA_TIME_OFFSET,
    connectTimeout: 20000,
    ssl,
  });
  await connection.query(`SET time_zone = '${CAMBODIA_TIME_OFFSET}'`);

  const stream = fs.createWriteStream(outputPath, { encoding: 'utf8' });
  stream.write(`-- NCEMDS MySQL backup\n`);
  stream.write(`-- Database: ${database}\n`);
  stream.write(`-- Created: ${formatCambodiaDateTime(now)}\n`);
  stream.write(`-- Time zone: Asia/Phnom_Penh (+07:00)\n\n`);
  stream.write(`SET FOREIGN_KEY_CHECKS=0;\n`);
  stream.write(`SET SQL_MODE='ANSI_QUOTES,NO_AUTO_VALUE_ON_ZERO';\n\n`);

  const [tables] = await connection.query('SHOW FULL TABLES');
  const tableKey = `Tables_in_${database}`;
  const tableTypeKey = 'Table_type';

  for (const tableRow of tables) {
    if (tableRow[tableTypeKey] !== 'BASE TABLE') continue;
    const tableName = tableRow[tableKey] || Object.values(tableRow)[0];
    const quotedTable = quoteIdentifier(tableName);

    const [createRows] = await connection.query(`SHOW CREATE TABLE ${quotedTable}`);
    stream.write(`DROP TABLE IF EXISTS ${quotedTable};\n`);
    stream.write(`${createRows[0]['Create Table']};\n\n`);

    const [rows, fields] = await connection.query(`SELECT * FROM ${quotedTable}`);
    if (rows.length === 0) {
      stream.write(`-- No rows for ${quotedTable}\n\n`);
      continue;
    }

    const columns = fields.map((field) => quoteIdentifier(field.name)).join(', ');
    for (const row of rows) {
      const values = fields.map((field) => formatValue(row[field.name])).join(', ');
      stream.write(`INSERT INTO ${quotedTable} (${columns}) VALUES (${values});\n`);
    }
    stream.write('\n');
  }

  stream.write(`SET FOREIGN_KEY_CHECKS=1;\n`);
  stream.end();

  await new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  await connection.end();
  const sizeMb = fs.statSync(outputPath).size / 1024 / 1024;
  console.log(`Backup written to ${outputPath}`);
  console.log(`Size: ${sizeMb.toFixed(2)} MB`);
}

main().catch((error) => {
  console.error('Database backup failed:', error.message);
  process.exitCode = 1;
});
