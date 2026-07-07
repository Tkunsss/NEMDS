const { pool } = require('../config/db');

const AmbulanceTrackingModel = {
  async add({ dispatch_id, ambulance_id, driver_user_id, call_id, latitude, longitude, status }) {
    const [result] = await pool.query(
      `INSERT INTO ambulance_tracking (dispatch_id, ambulance_id, driver_user_id, call_id, latitude, longitude, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [dispatch_id, ambulance_id, driver_user_id, call_id, latitude, longitude, status]
    );
    return result.insertId;
  },

  async findLatestByCall(call_id) {
    const [rows] = await pool.query(
      `SELECT * FROM ambulance_tracking WHERE call_id = ? ORDER BY created_at DESC LIMIT 1`,
      [call_id]
    );
    return rows[0] || null;
  },

  async findLatestByAmbulance(ambulance_id) {
    const [rows] = await pool.query(
      `SELECT * FROM ambulance_tracking WHERE ambulance_id = ? ORDER BY created_at DESC LIMIT 1`,
      [ambulance_id]
    );
    return rows[0] || null;
  }
};

module.exports = AmbulanceTrackingModel;
