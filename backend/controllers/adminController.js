// controllers/adminController.js
const UserModel = require('../models/userModel');
const HospitalModel = require('../models/hospitalModel');
const { pool } = require('../config/db');
const { buildSystemRecords } = require('../utils/systemRecords');
const { countAvailableAmbulances } = require('../utils/ambulanceStats');

const STAFF_ROLES = ['dispatcher', 'driver', 'admin'];
const HOSPITAL_REQUIRED_ROLES = ['dispatcher', 'driver'];

async function listUsers(req, res) {
  try {
    const users = await UserModel.findAll();
    return res.json({ success: true, data: users });
  } catch (error) {
    console.error('listUsers error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load users' });
  }
}

async function createStaffUser(req, res) {
  try {
    const { full_name, phone_number, email, password, role, hospital_id } = req.body;
    if (!full_name || !phone_number || !password || !role) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    if (!STAFF_ROLES.includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid staff role' });
    }
    if (HOSPITAL_REQUIRED_ROLES.includes(role) && !hospital_id) {
      return res.status(400).json({ success: false, message: 'A hospital is required for dispatcher and driver accounts' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const bcrypt = require('bcryptjs');
    const password_hash = await bcrypt.hash(password, 10);
    const userId = await UserModel.create({
      full_name,
      phone_number,
      email: email || null,
      password_hash,
      role,
      hospital_id: hospital_id || null
    });

    const user = await UserModel.findById(userId);
    return res.status(201).json({ success: true, data: user });
  } catch (error) {
    console.error('createStaffUser error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create staff user' });
  }
}

async function updateUser(req, res) {
  try {
    const userId = req.params.id;
    const { full_name, phone_number, email, password, role, hospital_id } = req.body;

    const fields = [];
    const values = [];

    if (full_name !== undefined) {
      fields.push('full_name = ?');
      values.push(full_name);
    }
    if (phone_number !== undefined) {
      fields.push('phone_number = ?');
      values.push(phone_number);
    }
    if (email !== undefined) {
      fields.push('email = ?');
      values.push(email ? email : null);
    }
    if (role !== undefined) {
      if (!STAFF_ROLES.includes(role)) {
        return res.status(400).json({ success: false, message: 'Invalid staff role' });
      }
      fields.push('role = ?');
      values.push(role);
    }
    if (hospital_id !== undefined) {
      fields.push('hospital_id = ?');
      values.push(hospital_id || null);
    }
    if (password !== undefined && password !== '') {
      if (password.length < 6) {
        return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
      }
      const bcrypt = require('bcryptjs');
      fields.push('password_hash = ?');
      values.push(await bcrypt.hash(password, 10));
    }

    if (role !== undefined && HOSPITAL_REQUIRED_ROLES.includes(role) && !hospital_id) {
      return res.status(400).json({ success: false, message: 'A hospital is required for dispatcher and driver accounts' });
    }

    if (!fields.length) {
      return res.status(400).json({ success: false, message: 'No changes provided' });
    }

    values.push(userId);
    await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE user_id = ?`, values);

    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    return res.json({ success: true, data: user });
  } catch (error) {
    console.error('updateUser error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      const duplicateField = error.sqlMessage?.includes('phone_number')
        ? 'phone number'
        : error.sqlMessage?.includes('email')
          ? 'email'
          : 'value';
      return res.status(409).json({ success: false, message: `That ${duplicateField} is already in use` });
    }
    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({ success: false, message: 'Selected hospital does not exist' });
    }
    if (error.code === 'WARN_DATA_TRUNCATED') {
      return res.status(400).json({ success: false, message: 'Invalid user role or field value' });
    }
    return res.status(500).json({ success: false, message: 'Failed to update user' });
  }
}

async function deactivateUser(req, res) {
  try {
    await UserModel.setActive(req.params.id, false);
    return res.json({ success: true, message: 'User deactivated' });
  } catch (error) {
    console.error('deactivateUser error:', error);
    return res.status(500).json({ success: false, message: 'Failed to deactivate user' });
  }
}

async function reactivateUser(req, res) {
  try {
    await UserModel.setActive(req.params.id, true);
    return res.json({ success: true, message: 'User reactivated' });
  } catch (error) {
    console.error('reactivateUser error:', error);
    return res.status(500).json({ success: false, message: 'Failed to reactivate user' });
  }
}

async function deleteUser(req, res) {
  try {
    await pool.query('DELETE FROM users WHERE user_id = ?', [req.params.id]);
    return res.json({ success: true, message: 'User deleted' });
  } catch (error) {
    console.error('deleteUser error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete user' });
  }
}

async function listHospitals(req, res) {
  try {
    const hospitals = await HospitalModel.findAll();
    return res.json({ success: true, data: hospitals });
  } catch (error) {
    console.error('listHospitals error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load hospitals' });
  }
}

async function createHospital(req, res) {
  try {
    const { name, address, latitude, longitude, phone_number } = req.body;
    if (!name || !address) {
      return res.status(400).json({ success: false, message: 'Name and address are required' });
    }

    const hospitalId = await HospitalModel.create({
      name,
      address,
      latitude: latitude || null,
      longitude: longitude || null,
      phone_number: phone_number || null
    });

    const hospital = await HospitalModel.findById(hospitalId);
    return res.status(201).json({ success: true, data: hospital });
  } catch (error) {
    console.error('createHospital error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create hospital' });
  }
}

async function deleteHospital(req, res) {
  try {
    await HospitalModel.delete(req.params.id);
    return res.json({ success: true, message: 'Hospital deleted' });
  } catch (error) {
    console.error('deleteHospital error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete hospital' });
  }
}

async function getStats(req, res) {
  try {
    const [userRows] = await pool.query('SELECT COUNT(*) AS total_users FROM users');
    const [hospitalRows] = await pool.query('SELECT COUNT(*) AS total_hospitals FROM hospitals');
    const [callRows] = await pool.query('SELECT COUNT(*) AS total_calls FROM emergency_calls');
    const [activeCallRows] = await pool.query("SELECT COUNT(*) AS active_calls FROM emergency_calls WHERE status IN ('pending', 'assigned', 'en_route', 'on_scene', 'transporting')");
    const [ambulanceRows] = await pool.query('SELECT COUNT(*) AS total_ambulances FROM ambulances WHERE deleted_at IS NULL');
    const [allAmbulanceRows] = await pool.query(`
      SELECT a.status, a.deleted_at,
             CASE WHEN da.ambulance_id IS NOT NULL THEN TRUE ELSE FALSE END AS has_driver
      FROM ambulances a
      LEFT JOIN driver_assignments da
        ON da.ambulance_id = a.ambulance_id AND da.is_current = TRUE
      WHERE a.deleted_at IS NULL
    `);
    const [dispatcherRows] = await pool.query("SELECT COUNT(*) AS total_dispatchers FROM users WHERE role = 'dispatcher'");
    const [driverRows] = await pool.query("SELECT COUNT(*) AS total_drivers FROM users WHERE role = 'driver'");

    return res.json({
      success: true,
      data: {
        total_calls: callRows[0].total_calls,
        active_calls: activeCallRows[0].active_calls,
        available_ambulances: countAvailableAmbulances(allAmbulanceRows),
        total_ambulances: ambulanceRows[0].total_ambulances,
        total_dispatchers: dispatcherRows[0].total_dispatchers,
        total_drivers: driverRows[0].total_drivers
      }
    });
  } catch (error) {
    console.error('getStats error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load statistics' });
  }
}

async function getSystemRecords(req, res) {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const offset = parseInt(req.query.offset, 10) || 0;

    const [callRows] = await pool.query(
      `SELECT *
       FROM emergency_calls
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    if (!callRows.length) {
      return res.json({ success: true, data: [], meta: { total: 0 } });
    }

    const callIds = callRows.map((call) => call.call_id);
    const logRows = callIds.length
      ? (await pool.query(
          `SELECT *
           FROM call_status_log
           WHERE call_id IN (${callIds.map(() => '?').join(', ')})
           ORDER BY call_id ASC, created_at ASC`,
          callIds
        ))[0]
      : [];

    const logsByCall = logRows.reduce((acc, row) => {
      if (!acc[row.call_id]) acc[row.call_id] = [];
      acc[row.call_id].push(row);
      return acc;
    }, {});

    const records = buildSystemRecords(callRows, logsByCall);
    const [countRows] = await pool.query('SELECT COUNT(*) AS total FROM emergency_calls');

    return res.json({ success: true, data: records, meta: { total: countRows[0].total } });
  } catch (error) {
    console.error('getSystemRecords error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load system records' });
  }
}

module.exports = {
  listUsers,
  createStaffUser,
  updateUser,
  deactivateUser,
  reactivateUser,
  deleteUser,
  listHospitals,
  createHospital,
  deleteHospital,
  getStats,
  getSystemRecords
};
