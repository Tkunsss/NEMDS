// models/callModel.js
const { pool } = require('../config/db');
const { generateEmergencyId } = require('../utils/emergencyId');

const CallModel = {
  // Generates a unique emergency_id and inserts the call. Retries a handful
  // of times on the rare collision (UNIQUE constraint) before giving up —
  // with a 32^6 keyspace this should essentially never need more than 1 try.
  //
  // assigned_hospital_id is the auto-routed nearest hospital, computed by
  // the controller (via utils/distance.js) before calling this — it's what
  // scopes which hospital's dispatcher can see this call.
  async create({ caller_user_id = null, caller_phone = null, emergency_type, severity, description, latitude, longitude, address_text, assigned_hospital_id = null }) {
    const MAX_ATTEMPTS = 5;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const emergency_id = generateEmergencyId();
      try {
        const [result] = await pool.query(
          `INSERT INTO emergency_calls
            (emergency_id, caller_user_id, caller_phone, emergency_type, severity, description, latitude, longitude, address_text, assigned_hospital_id, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
          [emergency_id, caller_user_id, caller_phone, emergency_type, severity, description, latitude, longitude, address_text, assigned_hospital_id]
        );
        return { call_id: result.insertId, emergency_id };
      } catch (err) {
        // ER_DUP_ENTRY on emergency_id collision — retry with a fresh code
        if (err.code === 'ER_DUP_ENTRY' && attempt < MAX_ATTEMPTS - 1) continue;
        throw err;
      }
    }
  },

  async findById(call_id) {
    const [rows] = await pool.query(
      `SELECT * FROM emergency_calls WHERE call_id = ? LIMIT 1`,
      [call_id]
    );
    return rows[0] || null;
  },

  async findByEmergencyId(emergency_id) {
    const [rows] = await pool.query(
      `SELECT * FROM emergency_calls WHERE emergency_id = ? LIMIT 1`,
      [emergency_id]
    );
    return rows[0] || null;
  },

  async findByCallerUser(caller_user_id) {
    const [rows] = await pool.query(
      `SELECT * FROM emergency_calls WHERE caller_user_id = ? ORDER BY created_at DESC`,
      [caller_user_id]
    );
    return rows;
  },

  async findByCallerPhone(caller_phone) {
    const [rows] = await pool.query(
      `SELECT * FROM emergency_calls WHERE caller_phone = ? ORDER BY created_at DESC`,
      [caller_phone]
    );
    return rows;
  },

  // Caller app now has no login/phone requirement either — call history is
  // tracked client-side via emergency IDs stored in the browser, then looked
  // up one by one. This batch lookup supports that pattern.
  async findByEmergencyIds(emergency_ids) {
    if (!emergency_ids || emergency_ids.length === 0) return [];
    const [rows] = await pool.query(
      `SELECT * FROM emergency_calls WHERE emergency_id IN (?) ORDER BY created_at DESC`,
      [emergency_ids]
    );
    return rows;
  },

  // hospital_id is optional — pass it to scope results to one hospital
  // (dispatcher view), omit it for system-wide visibility (admin view).
  async findPending(hospital_id = null) {
    const query = hospital_id
      ? `SELECT * FROM emergency_calls WHERE status = 'pending' AND assigned_hospital_id = ? ORDER BY created_at ASC`
      : `SELECT * FROM emergency_calls WHERE status = 'pending' ORDER BY created_at ASC`;
    const params = hospital_id ? [hospital_id] : [];
    const [rows] = await pool.query(query, params);
    return rows;
  },

  async findActive(hospital_id = null) {
    const query = hospital_id
      ? `SELECT * FROM emergency_calls WHERE status NOT IN ('completed', 'cancelled') AND assigned_hospital_id = ? ORDER BY created_at ASC`
      : `SELECT * FROM emergency_calls WHERE status NOT IN ('completed', 'cancelled') ORDER BY created_at ASC`;
    const params = hospital_id ? [hospital_id] : [];
    const [rows] = await pool.query(query, params);
    return rows;
  },

  async findAll({ limit = 100, offset = 0, hospital_id = null } = {}) {
    const query = hospital_id
      ? `SELECT * FROM emergency_calls WHERE assigned_hospital_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`
      : `SELECT * FROM emergency_calls ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    const params = hospital_id ? [hospital_id, limit, offset] : [limit, offset];
    const [rows] = await pool.query(query, params);
    return rows;
  },

  // Calls with no assigned hospital at all — e.g. no hospitals exist yet,
  // or none had coordinates at submission time. Surfaced to admin so these
  // never silently vanish unseen by any dispatcher.
  async findUnassigned() {
    const [rows] = await pool.query(
      `SELECT * FROM emergency_calls
       WHERE assigned_hospital_id IS NULL AND status NOT IN ('completed', 'cancelled')
       ORDER BY created_at ASC`
    );
    return rows;
  },

  async updateStatus(call_id, status) {
    await pool.query(
      `UPDATE emergency_calls SET status = ? WHERE call_id = ?`,
      [status, call_id]
    );
  },

  async setAssignedHospital(call_id, assigned_hospital_id) {
    await pool.query(
      `UPDATE emergency_calls SET assigned_hospital_id = ? WHERE call_id = ?`,
      [assigned_hospital_id, call_id]
    );
  },

  async setAIClassification(call_id, { ai_classification_label, ai_confidence }) {
    await pool.query(
      `UPDATE emergency_calls SET ai_classification_label = ?, ai_confidence = ? WHERE call_id = ?`,
      [ai_classification_label, ai_confidence, call_id]
    );
  },

  async cancel(call_id) {
    await pool.query(
      `UPDATE emergency_calls SET status = 'cancelled' WHERE call_id = ?`,
      [call_id]
    );
  }
};

module.exports = CallModel;
