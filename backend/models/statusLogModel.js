// models/statusLogModel.js
const { pool } = require('../config/db');

const StatusLogModel = {
  async add({ call_id, status, note = null, changed_by_user_id = null }) {
    const [result] = await pool.query(
      `INSERT INTO call_status_log (call_id, status, note, changed_by_user_id)
       VALUES (?, ?, ?, ?)`,
      [call_id, status, note, changed_by_user_id]
    );
    return result.insertId;
  },

  async findByCall(call_id) {
    const [rows] = await pool.query(
      `SELECT * FROM call_status_log WHERE call_id = ? ORDER BY created_at ASC`,
      [call_id]
    );
    return rows;
  }
};

module.exports = StatusLogModel;
