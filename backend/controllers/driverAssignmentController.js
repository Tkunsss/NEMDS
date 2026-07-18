// controllers/driverAssignmentController.js
const DriverAssignmentModel = require('../models/driverAssignmentModel');
const UserModel = require('../models/userModel');
const AmbulanceModel = require('../models/ambulanceModel');
const DriverDeviceModel = require('../models/driverDeviceModel');
const DispatchModel = require('../models/dispatchModel');

// GET /api/driver-assignments
// Dispatcher/admin: see which drivers are currently on which ambulance.
// Dispatchers are scoped to their own hospital's fleet.
async function listCurrentAssignments(req, res) {
  try {
    const hospital_id = req.user.role === 'dispatcher' ? req.user.hospital_id : null;
    const assignments = await DriverAssignmentModel.findAllCurrent(hospital_id);
    res.json({ success: true, data: assignments });
  } catch (err) {
    console.error('listCurrentAssignments error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

// GET /api/driver-assignments/available-drivers
// Drivers who belong to the dispatcher's hospital and are NOT currently
// assigned to any ambulance. A dispatcher should never see another
// hospital's driver roster, assigned or not — drivers are hospital staff.
async function listAvailableDrivers(req, res) {
  try {
    if (req.user.role === 'dispatcher' && !req.user.hospital_id) {
      return res.status(400).json({ success: false, message: 'Your account has no hospital assigned — contact an admin' });
    }

    const hospital_id = req.user.role === 'dispatcher' ? req.user.hospital_id : null;
    const hospitalDrivers = hospital_id
      ? await UserModel.findByRoleAndHospital('driver', hospital_id)
      : await UserModel.findAllByRole('driver');

    const currentAssignments = await DriverAssignmentModel.findAllCurrent(hospital_id);
    const assignedDriverIds = new Set(currentAssignments.map((a) => a.user_id));
    const available = hospitalDrivers.filter((d) => !assignedDriverIds.has(d.user_id) && d.is_active);

    res.json({ success: true, data: available });
  } catch (err) {
    console.error('listAvailableDrivers error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

// POST /api/driver-assignments
// Body: { user_id, ambulance_id }
// Enforces: the driver belongs to the dispatcher's hospital, AND the
// ambulance is based at the dispatcher's hospital. Both have to match —
// a dispatcher can't put a driver from Hospital A onto an ambulance based
// at Hospital B, even if they could otherwise see both records.
async function assignDriver(req, res) {
  try {
    const { user_id, ambulance_id } = req.body;
    if (!user_id || !ambulance_id) {
      return res.status(400).json({ success: false, message: 'user_id and ambulance_id are required' });
    }

    const driver = await UserModel.findById(user_id);
    if (!driver || driver.role !== 'driver') {
      return res.status(400).json({ success: false, message: 'user_id must belong to a driver account' });
    }

    const ambulance = await AmbulanceModel.findById(ambulance_id);
    if (!ambulance) {
      return res.status(404).json({ success: false, message: 'Ambulance not found' });
    }

    if (req.user.role === 'dispatcher') {
      const dispatcherHospital = req.user.hospital_id;
      if (driver.hospital_id !== dispatcherHospital) {
        return res.status(403).json({ success: false, message: 'This driver does not belong to your hospital' });
      }
      if (ambulance.home_hospital_id !== dispatcherHospital) {
        return res.status(403).json({ success: false, message: 'This ambulance is not based at your hospital' });
      }
    } else {
      // Admin override still has to keep the data consistent — a driver
      // and the ambulance they're assigned to should belong to the same
      // hospital, or "which hospital's dispatcher manages this crew" stops
      // making sense.
      if (driver.hospital_id !== ambulance.home_hospital_id) {
        return res.status(400).json({ success: false, message: "Driver's hospital and ambulance's home hospital must match" });
      }
    }

    const activeAmbulanceDispatch = await DispatchModel.findActiveForAmbulance(ambulance_id);
    if (activeAmbulanceDispatch) {
      return res.status(409).json({ success: false, message: 'This ambulance has an active dispatch and cannot be reassigned yet' });
    }

    const activeDriverDispatch = await DispatchModel.findActiveForDriver(user_id);
    if (activeDriverDispatch) {
      return res.status(409).json({ success: false, message: 'This driver has an active dispatch and cannot be reassigned yet' });
    }

    const device = await DriverDeviceModel.findByDriver(user_id);
    if (!device) {
      await DriverDeviceModel.ensureForDriver(driver);
    }

    await DriverAssignmentModel.assign({ user_id, ambulance_id, assigned_by_user_id: req.user.user_id });
    const assignment = await DriverAssignmentModel.findCurrentByAmbulance(ambulance_id);

    res.status(201).json({ success: true, data: assignment });
  } catch (err) {
    console.error('assignDriver error:', err);
    res.status(500).json({ success: false, message: 'Server error assigning driver' });
  }
}

// DELETE /api/driver-assignments/ambulance/:ambulanceId
async function unassignDriver(req, res) {
  try {
    if (req.user.role === 'dispatcher') {
      const ambulance = await AmbulanceModel.findById(req.params.ambulanceId);
      if (!ambulance) return res.status(404).json({ success: false, message: 'Ambulance not found' });
      if (ambulance.home_hospital_id !== req.user.hospital_id) {
        return res.status(403).json({ success: false, message: 'This ambulance is not based at your hospital' });
      }
    }

    const activeDispatch = await DispatchModel.findActiveForAmbulance(req.params.ambulanceId);
    if (activeDispatch) {
      return res.status(409).json({ success: false, message: 'This ambulance has an active dispatch and cannot be unassigned yet' });
    }

    await DriverAssignmentModel.unassign(req.params.ambulanceId);
    res.json({ success: true, message: 'Driver unassigned' });
  } catch (err) {
    console.error('unassignDriver error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

module.exports = { listCurrentAssignments, listAvailableDrivers, assignDriver, unassignDriver };
