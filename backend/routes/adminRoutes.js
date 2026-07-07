// routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/adminController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

router.use(requireAuth, requireRole('admin'));

router.get('/users', listUsers);
router.post('/users', createStaffUser);
router.patch('/users/:id', updateUser);
router.patch('/users/:id/deactivate', deactivateUser);
router.patch('/users/:id/reactivate', reactivateUser);
router.delete('/users/:id', deleteUser);

router.get('/hospitals', listHospitals);
router.post('/hospitals', createHospital);
router.delete('/hospitals/:id', deleteHospital);

router.get('/stats', getStats);
router.get('/records', getSystemRecords);

module.exports = router;
