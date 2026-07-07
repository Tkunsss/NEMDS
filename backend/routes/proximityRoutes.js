// routes/proximityRoutes.js
const express = require('express');
const router = express.Router();
const { nearestHospitals, nearestAmbulances } = require('../controllers/proximityController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

router.use(requireAuth, requireRole('dispatcher', 'admin'));

router.get('/hospitals', nearestHospitals);
router.get('/ambulances', nearestAmbulances);

module.exports = router;
