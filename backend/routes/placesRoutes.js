// routes/placesRoutes.js
const express = require('express');
const router = express.Router();
const { searchHospitals } = require('../controllers/placesController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

// Admin-only — this is a one-time data-import tool, not a runtime feature
router.get('/search-hospitals', requireAuth, requireRole('admin'), searchHospitals);

module.exports = router;
