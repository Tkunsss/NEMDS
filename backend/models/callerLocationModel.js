// models/callerLocationModel.js
const { pool } = require('../config/db');

const CallerLocationModel = {
  async addPing({ call_id, latitude, longitude, accuracy_meters = null }) {
    const [result] = await pool.query(
      `INSERT INTO caller_location_pings (call_id, latitude, longitude, accuracy_meters)
       VALUES (?, ?, ?, ?)`,
      [call_id, latitude, longitude, accuracy_meters]
    );
    return result.insertId;
  },

  // Most recent known position for this call — this is what dispatcher/driver
  // screens poll to track the caller live.
  async findLatest(call_id) {
    const [rows] = await pool.query(
      `SELECT * FROM caller_location_pings WHERE call_id = ? ORDER BY created_at DESC LIMIT 1`,
      [call_id]
    );
    return rows[0] || null;
  },

  // Full trail, e.g. for drawing a path on a map of how the caller has moved
  async findTrail(call_id, limit = 100) {
    const [rows] = await pool.query(
      `SELECT * FROM caller_location_pings WHERE call_id = ? ORDER BY created_at ASC LIMIT ?`,
      [call_id, limit]
    );
    return rows;
  }
};

module.exports = CallerLocationModel;
