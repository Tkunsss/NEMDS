// routes/callRoutes.js
const express = require('express');
const router = express.Router();
const {
  createCall,
  getCall,
  getMyCalls,
  listCalls,
  updateCallStatus,
  cancelCall,
  addLocationPing,
  getLatestLocation,
  getUnassignedCalls
} = require('../controllers/callController');
const { requireAuth, requireRole, optionalAuth } = require('../middleware/authMiddleware');
const { validateCreateCall } = require('../middleware/validators/callValidators');

// Caller app — fully open, no login required at all
router.post('/', optionalAuth, validateCreateCall, createCall);
router.get('/mine', getMyCalls);
router.patch('/:id/cancel', optionalAuth, cancelCall);
router.post('/:id/location', addLocationPing);

// Dispatcher / Admin / Driver — view + manage all calls
router.get('/', requireAuth, requireRole('dispatcher', 'admin'), listCalls);
router.get('/unassigned', requireAuth, requireRole('admin'), getUnassignedCalls); // before /:id
router.get('/:id', optionalAuth, getCall);
router.get('/:id/location', requireAuth, requireRole('dispatcher', 'admin', 'driver'), getLatestLocation);
router.patch('/:id/status', requireAuth, requireRole('dispatcher', 'driver', 'admin'), updateCallStatus);

module.exports = router;
