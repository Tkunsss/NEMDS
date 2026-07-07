// routes/ambulanceRoutes.js
const express = require('express');
const router = express.Router();
const {
  listAmbulances,
  createAmbulance,
  updateLocation,
  updateStatus,
  deleteAmbulance,
  restoreAmbulance,
  listDeletedAmbulances,
  getMyAmbulance,
  getAmbulanceLocation
} = require('../controllers/ambulanceController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

router.get('/', requireAuth, requireRole('dispatcher', 'admin'), listAmbulances);
router.get('/deleted', requireAuth, requireRole('admin'), listDeletedAmbulances);
router.post('/:id/restore', requireAuth, requireRole('admin'), restoreAmbulance);
router.post('/', requireAuth, requireRole('admin'), createAmbulance);
router.get('/my', requireAuth, requireRole('driver'), getMyAmbulance);
router.get('/:id/location', requireAuth, requireRole('dispatcher', 'admin', 'driver'), getAmbulanceLocation);
router.patch('/:id/location', requireAuth, requireRole('driver'), updateLocation);
router.patch('/:id/status', requireAuth, requireRole('driver', 'dispatcher', 'admin'), updateStatus);
router.delete('/:id', requireAuth, requireRole('admin'), deleteAmbulance);

module.exports = router;
