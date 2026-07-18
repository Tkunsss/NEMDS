// models/dispatchModel.js
const { pool } = require('../config/db');

const DispatchModel = {
  async create({ call_id, dispatcher_user_id, ambulance_id, driver_user_id = null, destination_hospital_id = null, notes = null }) {
    const [result] = await pool.query(
      `INSERT INTO dispatches (call_id, dispatcher_user_id, ambulance_id, driver_user_id, destination_hospital_id, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [call_id, dispatcher_user_id, ambulance_id, driver_user_id, destination_hospital_id, notes]
    );
    return result.insertId;
  },

  async findById(dispatch_id) {
    const [rows] = await pool.query(
      `SELECT * FROM dispatches WHERE dispatch_id = ? LIMIT 1`,
      [dispatch_id]
    );
    return rows[0] || null;
  },

  async findByCall(call_id) {
    const [rows] = await pool.query(
      `SELECT d.*, ec.emergency_id, ec.description, ec.address_text, ec.latitude AS call_lat,
              ec.longitude AS call_lng, ec.severity, ec.emergency_type, ec.status AS call_status,
              h.name AS destination_hospital_name, h.address AS destination_hospital_address,
              h.latitude AS destination_lat, h.longitude AS destination_lng,
              a.current_latitude AS ambulance_current_latitude, a.current_longitude AS ambulance_current_longitude, a.last_location_update AS ambulance_last_location_update,
              hh.name AS ambulance_hospital_name, hh.latitude AS ambulance_lat, hh.longitude AS ambulance_lng
       FROM dispatches d
       JOIN emergency_calls ec ON ec.call_id = d.call_id
       LEFT JOIN hospitals h ON h.hospital_id = d.destination_hospital_id
       LEFT JOIN ambulances a ON a.ambulance_id = d.ambulance_id
       LEFT JOIN hospitals hh ON hh.hospital_id = a.home_hospital_id
       WHERE d.call_id = ?
       ORDER BY d.dispatched_at DESC LIMIT 1`,
      [call_id]
    );
    return rows[0] || null;
  },

  async findByAmbulance(ambulance_id) {
    const [rows] = await pool.query(
      `SELECT * FROM dispatches WHERE ambulance_id = ? ORDER BY dispatched_at DESC`,
      [ambulance_id]
    );
    return rows;
  },

  async findActiveForAmbulance(ambulance_id) {
    const [rows] = await pool.query(
      `SELECT d.*
       FROM dispatches d
       JOIN emergency_calls ec ON ec.call_id = d.call_id
       WHERE d.ambulance_id = ? AND ec.status NOT IN ('completed', 'cancelled')
       ORDER BY d.dispatched_at DESC LIMIT 1`,
      [ambulance_id]
    );
    return rows[0] || null;
  },

  async findActiveForDriver(user_id) {
    const [rows] = await pool.query(
      `SELECT d.*, ec.emergency_id, ec.description, ec.address_text, ec.latitude AS call_lat,
              ec.longitude AS call_lng, ec.severity, ec.emergency_type, ec.status AS call_status,
              h.name AS destination_hospital_name, h.address AS destination_hospital_address,
              h.latitude AS destination_lat, h.longitude AS destination_lng,
              a.current_latitude AS ambulance_current_latitude, a.current_longitude AS ambulance_current_longitude, a.last_location_update AS ambulance_last_location_update,
              hh.name AS ambulance_hospital_name, hh.latitude AS ambulance_lat, hh.longitude AS ambulance_lng
       FROM dispatches d
       JOIN ambulances a ON a.ambulance_id = d.ambulance_id
       LEFT JOIN driver_assignments da ON da.ambulance_id = a.ambulance_id AND da.is_current = TRUE
       JOIN emergency_calls ec ON ec.call_id = d.call_id
       LEFT JOIN hospitals h ON h.hospital_id = d.destination_hospital_id
       LEFT JOIN hospitals hh ON hh.hospital_id = a.home_hospital_id
       WHERE (d.driver_user_id = ? OR (d.driver_user_id IS NULL AND da.user_id = ?))
         AND ec.status NOT IN ('completed', 'cancelled')
       ORDER BY d.dispatched_at DESC LIMIT 1`,
      [user_id, user_id]
    );
    return rows[0] || null;
  },

  async markArrivedScene(dispatch_id) {
    await pool.query(`UPDATE dispatches SET arrived_at_scene_at = NOW() WHERE dispatch_id = ?`, [dispatch_id]);
  },

  async markDepartedScene(dispatch_id) {
    await pool.query(`UPDATE dispatches SET departed_scene_at = NOW() WHERE dispatch_id = ?`, [dispatch_id]);
  },

  async markArrivedHospital(dispatch_id) {
    await pool.query(`UPDATE dispatches SET arrived_hospital_at = NOW() WHERE dispatch_id = ?`, [dispatch_id]);
  }
};

module.exports = DispatchModel;
