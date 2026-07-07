// routes/driverAssignmentRoutes.js
const express = require('express');
const router = express.Router();
const {
  listCurrentAssignments,
  listAvailableDrivers,
  assignDriver,
  unassignDriver
} = require('../controllers/driverAssignmentController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

router.use(requireAuth, requireRole('dispatcher', 'admin'));

router.get('/', listCurrentAssignments);
router.get('/available-drivers', listAvailableDrivers);
router.post('/', assignDriver);
router.delete('/ambulance/:ambulanceId', unassignDriver);

module.exports = router;
