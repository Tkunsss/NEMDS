// models/driverAssignmentModel.js
const { pool } = require('../config/db');

const DriverAssignmentModel = {
  // Ends any existing current assignment for this ambulance, then creates a new one.
  // An ambulance can only have one current driver at a time.
  async assign({ user_id, ambulance_id, assigned_by_user_id = null }) {
    await pool.query(
      `UPDATE driver_assignments SET is_current = FALSE, shift_end = NOW()
       WHERE ambulance_id = ? AND is_current = TRUE`,
      [ambulance_id]
    );
    // Also end any other current assignment this driver might have (one driver, one ambulance at a time)
    await pool.query(
      `UPDATE driver_assignments SET is_current = FALSE, shift_end = NOW()
       WHERE user_id = ? AND is_current = TRUE`,
      [user_id]
    );
    const [result] = await pool.query(
      `INSERT INTO driver_assignments (user_id, ambulance_id, assigned_by_user_id, shift_start, is_current)
       VALUES (?, ?, ?, NOW(), TRUE)`,
      [user_id, ambulance_id, assigned_by_user_id]
    );
    return result.insertId;
  },

  async unassign(ambulance_id) {
    await pool.query(
      `UPDATE driver_assignments SET is_current = FALSE, shift_end = NOW()
       WHERE ambulance_id = ? AND is_current = TRUE`,
      [ambulance_id]
    );
  },

  async findCurrentByAmbulance(ambulance_id) {
    const [rows] = await pool.query(
      `SELECT da.*, u.full_name AS driver_name, u.phone_number AS driver_phone,
              dd.device_id, dd.device_label, dd.device_identifier,
              dd.platform AS device_platform, dd.is_active AS device_is_active
       FROM driver_assignments da
       JOIN users u ON u.user_id = da.user_id
       LEFT JOIN driver_devices dd ON dd.user_id = u.user_id
       WHERE da.ambulance_id = ? AND da.is_current = TRUE
       LIMIT 1`,
      [ambulance_id]
    );
    return rows[0] || null;
  },

  async findCurrentByDriver(user_id) {
    const [rows] = await pool.query(
      `SELECT * FROM driver_assignments WHERE user_id = ? AND is_current = TRUE LIMIT 1`,
      [user_id]
    );
    return rows[0] || null;
  },

  // All current assignments, joined with driver + ambulance info — used by dispatcher
  // to see which drivers are already on an ambulance vs free to assign.
  // hospital_id scopes this to ambulances based at one hospital.
  async findAllCurrent(hospital_id = null) {
    const query = hospital_id
      ? `SELECT da.assignment_id, da.user_id, da.ambulance_id, da.shift_start,
                u.full_name AS driver_name, u.phone_number AS driver_phone,
                dd.device_id, dd.device_label, dd.device_identifier,
                dd.platform AS device_platform, dd.is_active AS device_is_active,
                a.plate_number, dispatcher.full_name AS assigned_by_name
         FROM driver_assignments da
         JOIN users u ON u.user_id = da.user_id
         LEFT JOIN users dispatcher ON dispatcher.user_id = da.assigned_by_user_id
         JOIN ambulances a ON a.ambulance_id = da.ambulance_id
         LEFT JOIN driver_devices dd ON dd.user_id = u.user_id
         WHERE da.is_current = TRUE AND a.home_hospital_id = ?`
      : `SELECT da.assignment_id, da.user_id, da.ambulance_id, da.shift_start,
                u.full_name AS driver_name, u.phone_number AS driver_phone,
                dd.device_id, dd.device_label, dd.device_identifier,
                dd.platform AS device_platform, dd.is_active AS device_is_active,
                a.plate_number, dispatcher.full_name AS assigned_by_name
         FROM driver_assignments da
         JOIN users u ON u.user_id = da.user_id
         LEFT JOIN users dispatcher ON dispatcher.user_id = da.assigned_by_user_id
         JOIN ambulances a ON a.ambulance_id = da.ambulance_id
         LEFT JOIN driver_devices dd ON dd.user_id = u.user_id
         WHERE da.is_current = TRUE`;
    const params = hospital_id ? [hospital_id] : [];
    const [rows] = await pool.query(query, params);
    return rows;
  }
};

module.exports = DriverAssignmentModel;
