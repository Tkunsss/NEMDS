// models/hospitalModel.js
const { pool } = require('../config/db');

const HospitalModel = {
  async create({ name, address, latitude, longitude, phone_number }) {
    const [result] = await pool.query(
      `INSERT INTO hospitals (name, address, latitude, longitude, phone_number)
       VALUES (?, ?, ?, ?, ?)`,
      [name, address, latitude, longitude, phone_number]
    );
    return result.insertId;
  },

  async findAll() {
    const [rows] = await pool.query(`SELECT * FROM hospitals ORDER BY name ASC`);
    return rows;
  },

  async findById(hospital_id) {
    const [rows] = await pool.query(`SELECT * FROM hospitals WHERE hospital_id = ? LIMIT 1`, [hospital_id]);
    return rows[0] || null;
  },

  async updateCapacityStatus(hospital_id, capacity_status) {
    await pool.query(`UPDATE hospitals SET capacity_status = ? WHERE hospital_id = ?`, [capacity_status, hospital_id]);
  },

  async delete(hospital_id) {
    await pool.query(`DELETE FROM hospitals WHERE hospital_id = ?`, [hospital_id]);
  }
};

module.exports = HospitalModel;
