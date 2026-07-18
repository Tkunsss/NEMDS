// models/ambulanceModel.js
const { pool } = require('../config/db');

const AmbulanceModel = {
  async create({ plate_number, vehicle_type = 'basic', home_hospital_id = null }) {
    const [result] = await pool.query(
      `INSERT INTO ambulances (plate_number, vehicle_type, home_hospital_id, status)
       VALUES (?, ?, ?, 'available')`,
      [plate_number, vehicle_type, home_hospital_id]
    );
    return result.insertId;
  },

  async findById(ambulance_id) {
    const [rows] = await pool.query(
      `SELECT * FROM ambulances WHERE ambulance_id = ? AND deleted_at IS NULL LIMIT 1`,
      [ambulance_id]
    );
    return rows[0] || null;
  },

  async findAvailable(hospital_id = null) {
    const query = hospital_id
      ? `SELECT * FROM ambulances WHERE status = 'available' AND home_hospital_id = ? AND deleted_at IS NULL`
      : `SELECT * FROM ambulances WHERE status = 'available' AND deleted_at IS NULL`;
    const params = hospital_id ? [hospital_id] : [];
    const [rows] = await pool.query(query, params);
    return rows;
  },

  // Used by dispatcher: only ambulances that are both available AND have a driver
  // currently assigned can actually be sent out. hospital_id scopes this to one
  // hospital's fleet — a dispatcher should never see another hospital's ambulances.
  async findAvailableWithDriver(hospital_id = null) {
    const query = hospital_id
      ? `SELECT a.*, u.full_name AS driver_name, u.phone_number AS driver_phone,
                 dd.device_id, dd.device_label, dd.device_identifier,
                 dd.platform AS device_platform, dd.is_active AS device_is_active,
                 h.latitude AS home_hospital_latitude, h.longitude AS home_hospital_longitude
         FROM ambulances a
         JOIN driver_assignments da ON da.ambulance_id = a.ambulance_id AND da.is_current = TRUE
         JOIN users u ON u.user_id = da.user_id
         LEFT JOIN driver_devices dd ON dd.user_id = u.user_id
         LEFT JOIN hospitals h ON h.hospital_id = a.home_hospital_id
         WHERE a.status = 'available' AND a.home_hospital_id = ? AND a.deleted_at IS NULL`
      : `SELECT a.*, u.full_name AS driver_name, u.phone_number AS driver_phone,
                 dd.device_id, dd.device_label, dd.device_identifier,
                 dd.platform AS device_platform, dd.is_active AS device_is_active,
                 h.latitude AS home_hospital_latitude, h.longitude AS home_hospital_longitude
         FROM ambulances a
         JOIN driver_assignments da ON da.ambulance_id = a.ambulance_id AND da.is_current = TRUE
         JOIN users u ON u.user_id = da.user_id
         LEFT JOIN driver_devices dd ON dd.user_id = u.user_id
         LEFT JOIN hospitals h ON h.hospital_id = a.home_hospital_id
         WHERE a.status = 'available' AND a.deleted_at IS NULL`;
    const params = hospital_id ? [hospital_id] : [];
    const [rows] = await pool.query(query, params);
    return rows;
  },

  async findAll(hospital_id = null) {
    const query = hospital_id
      ? `SELECT * FROM ambulances WHERE home_hospital_id = ? AND deleted_at IS NULL ORDER BY ambulance_id ASC`
      : `SELECT * FROM ambulances WHERE deleted_at IS NULL ORDER BY ambulance_id ASC`;
    const params = hospital_id ? [hospital_id] : [];
    const [rows] = await pool.query(query, params);
    return rows;
  },

  async updateStatus(ambulance_id, status) {
    await pool.query(`UPDATE ambulances SET status = ? WHERE ambulance_id = ?`, [status, ambulance_id]);
  },

  async delete(ambulance_id) {
    await pool.query(`UPDATE ambulances SET deleted_at = NOW() WHERE ambulance_id = ?`, [ambulance_id]);
  },

  async restore(ambulance_id) {
    await pool.query(`UPDATE ambulances SET deleted_at = NULL WHERE ambulance_id = ?`, [ambulance_id]);
  },

  async findDeletedById(ambulance_id) {
    const [rows] = await pool.query(
      `SELECT * FROM ambulances WHERE ambulance_id = ? AND deleted_at IS NOT NULL LIMIT 1`,
      [ambulance_id]
    );
    return rows[0] || null;
  },

  async findDeletedWithinHours(hours = 24) {
    const [rows] = await pool.query(
      `SELECT * FROM ambulances WHERE deleted_at IS NOT NULL AND deleted_at >= NOW() - INTERVAL ? HOUR ORDER BY deleted_at DESC`,
      [hours]
    );
    return rows;
  },

  async updateLocation(ambulance_id, latitude, longitude) {
    await pool.query(
      `UPDATE ambulances
       SET current_latitude = ?, current_longitude = ?, last_location_update = NOW()
       WHERE ambulance_id = ?`,
      [latitude, longitude, ambulance_id]
    );
  },

  async findByDriverUserId(user_id) {
    const [rows] = await pool.query(
      `SELECT a.* FROM ambulances a
       JOIN driver_assignments da ON da.ambulance_id = a.ambulance_id
       WHERE da.user_id = ? AND da.is_current = TRUE AND a.deleted_at IS NULL
       LIMIT 1`,
      [user_id]
    );
    return rows[0] || null;
  }
};

module.exports = AmbulanceModel;
