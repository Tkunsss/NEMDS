// models/userModel.js
const { pool } = require('../config/db');

function isOptionalStaffSchemaError(error) {
  return error && (
    error.code === 'ER_NO_SUCH_TABLE' ||
    error.code === 'ER_BAD_FIELD_ERROR' ||
    error.code === 'ER_TABLEACCESS_DENIED_ERROR'
  );
}

async function queryWithStaffMetadata(sql, params, fallbackSql, fallbackParams = params) {
  try {
    const [rows] = await pool.query(sql, params);
    return rows;
  } catch (error) {
    if (!isOptionalStaffSchemaError(error)) throw error;
    console.warn('[users] optional staff metadata unavailable, using base user query:', error.sqlMessage || error.message);
    const [rows] = await pool.query(fallbackSql, fallbackParams);
    return rows;
  }
}

const UserModel = {
  async create({ full_name, phone_number, email, password_hash, role, hospital_id = null }) {
    const [result] = await pool.query(
      `INSERT INTO users (full_name, phone_number, email, password_hash, role, hospital_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [full_name, phone_number, email, password_hash, role, hospital_id]
    );
    return result.insertId;
  },

  async findByPhone(phone_number) {
    const [rows] = await pool.query(
      `SELECT * FROM users WHERE phone_number = ? LIMIT 1`,
      [phone_number]
    );
    return rows[0] || null;
  },

  async findByEmail(email) {
    const [rows] = await pool.query(
      `SELECT * FROM users WHERE email = ? LIMIT 1`,
      [email]
    );
    return rows[0] || null;
  },

  async findById(user_id) {
    const rows = await queryWithStaffMetadata(
      `SELECT u.user_id, u.full_name, u.phone_number, u.email, u.role, u.hospital_id,
              u.is_active, u.created_at, h.name AS hospital_name,
              dd.device_id, dd.device_label, dd.device_identifier, dd.platform AS device_platform,
              dd.is_active AS device_is_active, dd.last_seen_at AS device_last_seen_at
       FROM users u
       LEFT JOIN hospitals h ON h.hospital_id = u.hospital_id
       LEFT JOIN driver_devices dd ON dd.user_id = u.user_id
       WHERE u.user_id = ? LIMIT 1`,
      [user_id],
      `SELECT u.user_id, u.full_name, u.phone_number, u.email, u.role,
              NULL AS hospital_id, u.is_active, u.created_at,
              NULL AS hospital_name, NULL AS device_id, NULL AS device_label,
              NULL AS device_identifier, NULL AS device_platform,
              NULL AS device_is_active, NULL AS device_last_seen_at
       FROM users u
       WHERE u.user_id = ? LIMIT 1`
    );
    return rows[0] || null;
  },

  async findAllByRole(role) {
    const rows = await queryWithStaffMetadata(
      `SELECT u.user_id, u.full_name, u.phone_number, u.email, u.role, u.hospital_id,
              u.is_active, u.created_at, h.name AS hospital_name,
              dd.device_id, dd.device_label, dd.device_identifier, dd.platform AS device_platform,
              dd.is_active AS device_is_active, dd.last_seen_at AS device_last_seen_at
       FROM users u
       LEFT JOIN hospitals h ON h.hospital_id = u.hospital_id
       LEFT JOIN driver_devices dd ON dd.user_id = u.user_id
       WHERE u.role = ? ORDER BY u.created_at DESC`,
      [role],
      `SELECT u.user_id, u.full_name, u.phone_number, u.email, u.role,
              NULL AS hospital_id, u.is_active, u.created_at,
              NULL AS hospital_name, NULL AS device_id, NULL AS device_label,
              NULL AS device_identifier, NULL AS device_platform,
              NULL AS device_is_active, NULL AS device_last_seen_at
       FROM users u
       WHERE u.role = ? ORDER BY u.created_at DESC`
    );
    return rows;
  },
  // Drivers belonging to a specific hospital — used by dispatcher's Crew
  // screen, which should only ever offer drivers from the dispatcher's own
  // hospital.
  async findByRoleAndHospital(role, hospital_id) {
    const rows = await queryWithStaffMetadata(
      `SELECT u.user_id, u.full_name, u.phone_number, u.email, u.role, u.hospital_id,
              u.is_active, u.created_at,
              dd.device_id, dd.device_label, dd.device_identifier, dd.platform AS device_platform,
              dd.is_active AS device_is_active, dd.last_seen_at AS device_last_seen_at
       FROM users u
       LEFT JOIN driver_devices dd ON dd.user_id = u.user_id
       WHERE u.role = ? AND u.hospital_id = ? ORDER BY u.created_at DESC`,
      [role, hospital_id],
      `SELECT u.user_id, u.full_name, u.phone_number, u.email, u.role,
              NULL AS hospital_id, u.is_active, u.created_at,
              NULL AS device_id, NULL AS device_label, NULL AS device_identifier,
              NULL AS device_platform, NULL AS device_is_active, NULL AS device_last_seen_at
       FROM users u
       WHERE u.role = ? ORDER BY u.created_at DESC`,
      [role]
    );
    return rows;
  },

  async findAll() {
    const rows = await queryWithStaffMetadata(
      `SELECT u.user_id, u.full_name, u.phone_number, u.email, u.role, u.hospital_id,
              u.is_active, u.created_at, h.name AS hospital_name,
              dd.device_id, dd.device_label, dd.device_identifier, dd.platform AS device_platform,
              dd.is_active AS device_is_active, dd.last_seen_at AS device_last_seen_at
       FROM users u
       LEFT JOIN hospitals h ON h.hospital_id = u.hospital_id
       LEFT JOIN driver_devices dd ON dd.user_id = u.user_id
       ORDER BY u.created_at DESC`,
      [],
      `SELECT u.user_id, u.full_name, u.phone_number, u.email, u.role,
              NULL AS hospital_id, u.is_active, u.created_at,
              NULL AS hospital_name, NULL AS device_id, NULL AS device_label,
              NULL AS device_identifier, NULL AS device_platform,
              NULL AS device_is_active, NULL AS device_last_seen_at
       FROM users u
       ORDER BY u.created_at DESC`
    );
    return rows;
  },

  async setActive(user_id, is_active) {
    await pool.query(`UPDATE users SET is_active = ? WHERE user_id = ?`, [is_active, user_id]);
  },

  async setHospital(user_id, hospital_id) {
    await pool.query(`UPDATE users SET hospital_id = ? WHERE user_id = ?`, [hospital_id, user_id]);
  }
};

module.exports = UserModel;
