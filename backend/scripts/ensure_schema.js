// scripts/ensure_schema.js
// Idempotently applies the schema pieces required by the current app.

require('dotenv').config();
const { pool } = require('../config/db');

async function tableExists(tableName) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS count
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = ?`,
    [tableName]
  );
  return rows[0].count > 0;
}

async function columnExists(tableName, columnName) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS count
     FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
    [tableName, columnName]
  );
  return rows[0].count > 0;
}

async function indexExists(tableName, indexName) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS count
     FROM information_schema.statistics
     WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?`,
    [tableName, indexName]
  );
  return rows[0].count > 0;
}

async function run(label, sql) {
  await pool.query(sql);
  console.log(`OK: ${label}`);
}

async function ensureColumn(tableName, columnName, definition) {
  if (await columnExists(tableName, columnName)) {
    console.log(`Skip: ${tableName}.${columnName} already exists`);
    return;
  }
  await run(`add ${tableName}.${columnName}`, `ALTER TABLE ${tableName} ADD COLUMN ${definition}`);
}

async function ensureIndex(tableName, indexName, sql) {
  if (await indexExists(tableName, indexName)) {
    console.log(`Skip: ${indexName} already exists`);
    return;
  }
  await run(`create ${indexName}`, sql);
}

async function ensureDriverDevices() {
  if (!(await tableExists('driver_devices'))) {
    await run(
      'create driver_devices',
      `CREATE TABLE driver_devices (
        device_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL UNIQUE,
        device_label VARCHAR(100),
        device_identifier VARCHAR(191) UNIQUE,
        platform ENUM('mobile', 'tablet', 'other') DEFAULT 'mobile',
        is_active BOOLEAN DEFAULT TRUE,
        registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_seen_at TIMESTAMP NULL,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
      )`
    );
  } else {
    console.log('Skip: driver_devices already exists');
  }

  await ensureIndex(
    'driver_devices',
    'idx_driver_devices_active',
    'CREATE INDEX idx_driver_devices_active ON driver_devices(is_active)'
  );

  await run(
    'backfill driver devices',
    `INSERT INTO driver_devices (user_id, device_label, device_identifier, platform, is_active)
     SELECT user_id, CONCAT(full_name, '''s device'), phone_number, 'mobile', TRUE
     FROM users u
     WHERE u.role = 'driver'
       AND NOT EXISTS (
         SELECT 1
         FROM driver_devices dd
         WHERE dd.user_id = u.user_id
       )`
  );
}

async function main() {
  await ensureColumn('users', 'hospital_id', 'hospital_id INT NULL AFTER role');
  await ensureIndex('users', 'idx_users_hospital', 'CREATE INDEX idx_users_hospital ON users(hospital_id)');

  await ensureColumn('emergency_calls', 'assigned_hospital_id', 'assigned_hospital_id INT NULL AFTER status');
  await ensureIndex(
    'emergency_calls',
    'idx_calls_assigned_hospital',
    'CREATE INDEX idx_calls_assigned_hospital ON emergency_calls(assigned_hospital_id)'
  );

  await ensureColumn('ambulances', 'deleted_at', 'deleted_at TIMESTAMP NULL');
  await ensureDriverDevices();
  await ensureColumn('driver_assignments', 'assigned_by_user_id', 'assigned_by_user_id INT NULL AFTER ambulance_id');
  await ensureIndex(
    'driver_assignments',
    'idx_driver_assignments_assigned_by',
    'CREATE INDEX idx_driver_assignments_assigned_by ON driver_assignments(assigned_by_user_id)'
  );

  await ensureColumn('dispatches', 'driver_user_id', 'driver_user_id INT NULL AFTER ambulance_id');
  await ensureIndex('dispatches', 'idx_dispatches_driver', 'CREATE INDEX idx_dispatches_driver ON dispatches(driver_user_id)');
}

main()
  .then(async () => {
    await pool.end();
    console.log('Schema check complete');
  })
  .catch(async (error) => {
    console.error('Schema check failed:', error);
    await pool.end();
    process.exit(1);
  });
