// models/driverDeviceModel.js
const { pool } = require('../config/db');

const DriverDeviceModel = {
  async upsertForDriver({ user_id, device_label = null, device_identifier = null, platform = 'mobile' }) {
    const existing = await this.findByDriver(user_id);
    if (existing) {
      await pool.query(
        `UPDATE driver_devices
         SET device_label = ?, device_identifier = ?, platform = ?, is_active = TRUE
         WHERE user_id = ?`,
        [device_label, device_identifier, platform, user_id]
      );
      return existing.device_id;
    }

    const [result] = await pool.query(
      `INSERT INTO driver_devices (user_id, device_label, device_identifier, platform, is_active)
       VALUES (?, ?, ?, ?, TRUE)`,
      [user_id, device_label, device_identifier, platform]
    );
    return result.insertId;
  },

  async ensureForDriver({ user_id, full_name, phone_number }) {
    const label = full_name ? `${full_name}'s device` : 'Driver device';
    await this.upsertForDriver({
      user_id,
      device_label: label,
      device_identifier: phone_number || null,
      platform: 'mobile'
    });
  },

  async findByDriver(user_id) {
    const [rows] = await pool.query(
      `SELECT * FROM driver_devices WHERE user_id = ? LIMIT 1`,
      [user_id]
    );
    return rows[0] || null;
  },

  async setActiveForDriver(user_id, is_active) {
    await pool.query(
      `UPDATE driver_devices SET is_active = ? WHERE user_id = ?`,
      [is_active, user_id]
    );
  }
};

module.exports = DriverDeviceModel;
