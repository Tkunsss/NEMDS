const express = require('express');
const router = express.Router();
const { requireAuth, requireRole, optionalAuth } = require('../middleware/authMiddleware');
const {
  updateAmbulanceTracking,
  getAmbulanceTrackingForCall,
  getAmbulanceTrackingForAmbulance
} = require('../controllers/trackingController');

router.post('/ambulance/:id/location', requireAuth, requireRole('driver'), updateAmbulanceTracking);
router.get('/call/:callId', optionalAuth, getAmbulanceTrackingForCall);
router.get('/ambulance/:id', requireAuth, requireRole('dispatcher', 'admin', 'driver'), getAmbulanceTrackingForAmbulance);

module.exports = router;
