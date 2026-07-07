// controllers/authController.js
const bcrypt = require('bcryptjs');
const UserModel = require('../models/userModel');
const { signToken } = require('../utils/jwt');

// POST /api/auth/register
// Used by caller app (self-registration) and admin app (creating staff accounts)
async function register(req, res) {
  try {
    const { full_name, phone_number, email, password, role = 'caller', hospital_id = null } = req.body;

    if (!full_name || !phone_number || !password) {
      return res.status(400).json({ success: false, message: 'full_name, phone_number, and password are required' });
    }

    if ((role === 'dispatcher' || role === 'driver') && !hospital_id) {
      return res.status(400).json({ success: false, message: 'hospital_id is required for dispatcher and driver accounts' });
    }

    const existing = await UserModel.findByPhone(phone_number);
    if (existing) {
      return res.status(409).json({ success: false, message: 'Phone number already registered' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const user_id = await UserModel.create({ full_name, phone_number, email, password_hash, role, hospital_id });

    const token = signToken({ user_id, role, full_name, hospital_id });
    res.status(201).json({ success: true, data: { user_id, full_name, role, hospital_id, token } });
  } catch (err) {
    console.error('register error:', err);
    res.status(500).json({ success: false, message: 'Server error during registration' });
  }
}

// POST /api/auth/login
async function login(req, res) {
  try {
    const { phone_number, password } = req.body;

    if (!phone_number || !password) {
      console.warn('[auth] login rejected: missing credentials', { phone_number: Boolean(phone_number) });
      return res.status(400).json({ success: false, message: 'phone_number and password are required' });
    }

    const user = await UserModel.findByPhone(phone_number);
    if (!user) {
      console.warn('[auth] login failed: user not found', { phone_number });
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      console.warn('[auth] login failed: invalid password', { phone_number });
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!user.is_active) {
      console.warn('[auth] login failed: account inactive', { phone_number });
      return res.status(403).json({ success: false, message: 'Account is deactivated' });
    }

    const token = signToken({ user_id: user.user_id, role: user.role, full_name: user.full_name, hospital_id: user.hospital_id });
    res.json({
      success: true,
      data: {
        user_id: user.user_id,
        full_name: user.full_name,
        role: user.role,
        hospital_id: user.hospital_id,
        token
      }
    });
  } catch (err) {
    console.error('[auth] login error:', err);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
}

// GET /api/auth/me
async function getMe(req, res) {
  try {
    const user = await UserModel.findById(req.user.user_id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: user });
  } catch (err) {
    console.error('getMe error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

module.exports = { register, login, getMe };
