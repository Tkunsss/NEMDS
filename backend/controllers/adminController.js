// controllers/adminController.js
const UserModel = require('../models/userModel');
const HospitalModel = require('../models/hospitalModel');
const { pool } = require('../config/db');

async function listUsers(req, res) {
  try {
    const users = await UserModel.findAll();
    return res.json({ success: true, users });
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
    return res.status(201).json({ success: true, user });
  } catch (error) {
    console.error('createStaffUser error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create staff user' });
  }
}

async function updateUser(req, res) {
  try {
    const userId = req.params.id;
    const { full_name, phone_number, email, role, hospital_id } = req.body;

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
      values.push(email);
    }
    if (role !== undefined) {
      fields.push('role = ?');
      values.push(role);
    }
    if (hospital_id !== undefined) {
      fields.push('hospital_id = ?');
      values.push(hospital_id || null);
    }

    if (!fields.length) {
      return res.status(400).json({ success: false, message: 'No changes provided' });
    }

    values.push(userId);
    await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE user_id = ?`, values);

    const user = await UserModel.findById(userId);
    return res.json({ success: true, user });
  } catch (error) {
    console.error('updateUser error:', error);
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
    return res.json({ success: true, hospitals });
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
    return res.status(201).json({ success: true, hospital });
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

    return res.json({
      success: true,
      stats: {
        totalUsers: userRows[0].total_users,
        totalHospitals: hospitalRows[0].total_hospitals,
        totalCalls: callRows[0].total_calls
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
    const [rows] = await pool.query(
      'SELECT * FROM system_logs ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [limit, offset]
    );
    return res.json({ success: true, records: rows });
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
