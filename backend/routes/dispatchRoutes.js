// routes/dispatchRoutes.js
const express = require('express');
const router = express.Router();
const {
  createDispatch,
  getDispatchForCall,
  getActiveDispatchForDriver,
  markEnRoute,
  markArrivedScene,
  markDepartedScene,
  markArrivedHospital
} = require('../controllers/dispatchController');
const { requireAuth, requireRole, optionalAuth } = require('../middleware/authMiddleware');

// Dispatcher creates a dispatch (assigns ambulance to a call)
router.post('/', requireAuth, requireRole('dispatcher', 'admin'), createDispatch);
router.get('/call/:callId', optionalAuth, getDispatchForCall);

// Driver app
router.get('/active', requireAuth, requireRole('driver'), getActiveDispatchForDriver);
router.patch('/:id/en-route', requireAuth, requireRole('driver'), markEnRoute);
router.patch('/:id/arrived-scene', requireAuth, requireRole('driver'), markArrivedScene);
router.patch('/:id/departed-scene', requireAuth, requireRole('driver'), markDepartedScene);
router.patch('/:id/arrived-hospital', requireAuth, requireRole('driver'), markArrivedHospital);

module.exports = router;
