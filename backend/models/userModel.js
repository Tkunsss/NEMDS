// models/userModel.js
const { pool } = require('../config/db');

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
      `SELECT * FROM users WHERE phone_number = ? AND deleted_at IS NULL LIMIT 1`,
      [phone_number]
    );
    return rows[0] || null;
  },

  async findByEmail(email) {
    const [rows] = await pool.query(
      `SELECT * FROM users WHERE email = ? AND deleted_at IS NULL LIMIT 1`,
      [email]
    );
    return rows[0] || null;
  },

  async findById(user_id) {
    const [rows] = await pool.query(
      `SELECT u.user_id, u.full_name, u.phone_number, u.email, u.role, u.hospital_id,
              u.is_active, u.created_at, h.name AS hospital_name
       FROM users u
       LEFT JOIN hospitals h ON h.hospital_id = u.hospital_id
       WHERE u.user_id = ? AND u.deleted_at IS NULL LIMIT 1`,
      [user_id]
    );
    return rows[0] || null;
  },

  async findDeletedById(user_id) {
    const [rows] = await pool.query(
      `SELECT u.user_id, u.full_name, u.phone_number, u.email, u.role, u.hospital_id,
              u.is_active, u.created_at, h.name AS hospital_name
       FROM users u
       LEFT JOIN hospitals h ON h.hospital_id = u.hospital_id
       WHERE u.user_id = ? AND u.deleted_at IS NOT NULL LIMIT 1`,
      [user_id]
    );
    return rows[0] || null;
  },

  async findAllByRole(role) {
    const [rows] = await pool.query(
      `SELECT u.user_id, u.full_name, u.phone_number, u.email, u.role, u.hospital_id,
              u.is_active, u.created_at, h.name AS hospital_name
       FROM users u
       LEFT JOIN hospitals h ON h.hospital_id = u.hospital_id
       WHERE u.role = ? AND u.deleted_at IS NULL ORDER BY u.created_at DESC`,
      [role]
    );
    return rows;
  },

  async searchByTerm(term) {
    const normalizedTerm = `%${term.trim()}%`;
    const [rows] = await pool.query(
      `SELECT u.user_id, u.full_name, u.phone_number, u.email, u.role, u.hospital_id,
              u.is_active, u.created_at, h.name AS hospital_name
       FROM users u
       LEFT JOIN hospitals h ON h.hospital_id = u.hospital_id
       WHERE u.deleted_at IS NULL AND (LOWER(u.full_name) LIKE LOWER(?) OR u.phone_number LIKE ?)
       ORDER BY u.created_at DESC`,
      [normalizedTerm, normalizedTerm]
    );
    return rows;
  },
  // Drivers belonging to a specific hospital — used by dispatcher's Crew
  // screen, which should only ever offer drivers from the dispatcher's own
  // hospital.
  async findByRoleAndHospital(role, hospital_id) {
    const [rows] = await pool.query(
      `SELECT u.user_id, u.full_name, u.phone_number, u.email, u.role, u.hospital_id,
              u.is_active, u.created_at
       FROM users u
       WHERE u.role = ? AND u.hospital_id = ? AND u.deleted_at IS NULL ORDER BY u.created_at DESC`,
      [role, hospital_id]
    );
    return rows;
  },

  async findAll() {
    const [rows] = await pool.query(
      `SELECT u.user_id, u.full_name, u.phone_number, u.email, u.role, u.hospital_id,
              u.is_active, u.created_at, h.name AS hospital_name
       FROM users u
       LEFT JOIN hospitals h ON h.hospital_id = u.hospital_id
       WHERE u.deleted_at IS NULL
       ORDER BY u.created_at DESC`
    );
    return rows;
  },

  async findDeletedWithinHours(hours = 24) {
    const [rows] = await pool.query(
      `SELECT u.user_id, u.full_name, u.phone_number, u.email, u.role, u.hospital_id,
              u.is_active, u.created_at, h.name AS hospital_name
       FROM users u
       LEFT JOIN hospitals h ON h.hospital_id = u.hospital_id
       WHERE u.deleted_at IS NOT NULL AND u.deleted_at >= NOW() - INTERVAL ? HOUR
       ORDER BY u.deleted_at DESC`,
      [hours]
    );
    return rows;
  },

  async setActive(user_id, is_active) {
    await pool.query(`UPDATE users SET is_active = ? WHERE user_id = ?`, [is_active, user_id]);
  },

  async setHospital(user_id, hospital_id) {
    await pool.query(`UPDATE users SET hospital_id = ? WHERE user_id = ?`, [hospital_id, user_id]);
  },

  async delete(user_id) {
    await pool.query(`UPDATE users SET deleted_at = NOW() WHERE user_id = ?`, [user_id]);
  },

  async restore(user_id) {
    await pool.query(`UPDATE users SET deleted_at = NULL WHERE user_id = ?`, [user_id]);
  },

  async permanentDelete(user_id) {
    await pool.query(`DELETE FROM users WHERE user_id = ?`, [user_id]);
  }
};

module.exports = UserModel;
