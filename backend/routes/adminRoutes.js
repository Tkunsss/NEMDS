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
  restoreUser,
  permanentDeleteUser,
  listHospitals,
  createHospital,
  deleteHospital,
  restoreHospital,
  permanentDeleteHospital,
  listRecentlyRemoved,
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
router.post('/users/:id/restore', restoreUser);
router.delete('/users/:id/permanent', permanentDeleteUser);

router.get('/hospitals', listHospitals);
router.post('/hospitals', createHospital);
router.delete('/hospitals/:id', deleteHospital);
router.post('/hospitals/:id/restore', restoreHospital);
router.delete('/hospitals/:id/permanent', permanentDeleteHospital);

router.get('/recently-removed', listRecentlyRemoved);
router.get('/stats', getStats);
router.get('/records', getSystemRecords);

module.exports = router;
