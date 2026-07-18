// controllers/ambulanceController.js
const AmbulanceModel = require('../models/ambulanceModel');
const HospitalModel = require('../models/hospitalModel');

async function requireDriverAmbulance(req, res) {
  if (req.user.role !== 'driver') return true;
  const ambulance = await AmbulanceModel.findByDriverUserId(req.user.user_id);
  if (!ambulance || Number(ambulance.ambulance_id) !== Number(req.params.id)) {
    res.status(403).json({ success: false, message: 'This ambulance is assigned to another driver' });
    return false;
  }
  return true;
}

// GET /api/ambulances
// Dispatchers only see their own hospital's fleet; admin sees everything.
async function listAmbulances(req, res) {
  try {
    const { status } = req.query;
    const hospital_id = req.user.role === 'dispatcher' ? req.user.hospital_id : null;

    let ambulances;
    if (status === 'available_with_driver') {
      ambulances = await AmbulanceModel.findAvailableWithDriver(hospital_id);
    } else if (status === 'available') {
      ambulances = await AmbulanceModel.findAvailable(hospital_id);
    } else {
      ambulances = await AmbulanceModel.findAll(hospital_id);
    }
    res.json({ success: true, data: ambulances });
  } catch (err) {
    console.error('listAmbulances error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

// POST /api/ambulances  (admin only)
async function createAmbulance(req, res) {
  try {
    const { plate_number, vehicle_type, home_hospital_id } = req.body;
    if (!plate_number) return res.status(400).json({ success: false, message: 'plate_number is required' });

    const ambulance_id = await AmbulanceModel.create({ plate_number, vehicle_type, home_hospital_id });
    const ambulance = await AmbulanceModel.findById(ambulance_id);
    res.status(201).json({ success: true, data: ambulance });
  } catch (err) {
    console.error('createAmbulance error:', err);
    if (err?.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'An ambulance with this plate number already exists' });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

// PATCH /api/ambulances/:id/location  (driver app pushes GPS updates)
async function updateLocation(req, res) {
  try {
    const { latitude, longitude } = req.body;
    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ success: false, message: 'latitude and longitude are required' });
    }
    if (!(await requireDriverAmbulance(req, res))) return;
    await AmbulanceModel.updateLocation(req.params.id, latitude, longitude);

    // TODO: io.emit ambulance location to dispatcher console + caller tracking screen

    res.json({ success: true, message: 'Location updated' });
  } catch (err) {
    console.error('updateLocation error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

// PATCH /api/ambulances/:id/status
async function updateStatus(req, res) {
  try {
    const { status } = req.body;
    const validStatuses = ['available', 'dispatched', 'en_route', 'at_scene', 'transporting', 'out_of_service'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    if (!(await requireDriverAmbulance(req, res))) return;
    await AmbulanceModel.updateStatus(req.params.id, status);
    res.json({ success: true, message: 'Status updated' });
  } catch (err) {
    console.error('updateStatus error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

// DELETE /api/ambulances/:id
async function deleteAmbulance(req, res) {
  try {
    await AmbulanceModel.delete(req.params.id);
    res.json({ success: true, message: 'Ambulance deleted' });
  } catch (err) {
    console.error('deleteAmbulance error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

// POST /api/ambulances/:id/restore
async function restoreAmbulance(req, res) {
  try {
    const ambulance = await AmbulanceModel.findDeletedById(req.params.id);
    if (!ambulance) {
      return res.status(404).json({ success: false, message: 'Deleted ambulance not found or recovery window expired' });
    }
    await AmbulanceModel.restore(req.params.id);
    res.json({ success: true, message: 'Ambulance restored' });
  } catch (err) {
    console.error('restoreAmbulance error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

// GET /api/ambulances/deleted?hours=24
async function listDeletedAmbulances(req, res) {
  try {
    const hours = Math.min(Math.max(Number(req.query.hours) || 24, 1), 168);
    const ambulances = await AmbulanceModel.findDeletedWithinHours(hours);
    res.json({ success: true, data: ambulances });
  } catch (err) {
    console.error('listDeletedAmbulances error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

// GET /api/ambulances/my  (driver app: get my assigned ambulance)
async function getMyAmbulance(req, res) {
  try {
    const ambulance = await AmbulanceModel.findByDriverUserId(req.user.user_id);
    if (!ambulance) return res.status(404).json({ success: false, message: 'No ambulance currently assigned' });
    res.json({ success: true, data: ambulance });
  } catch (err) {
    console.error('getMyAmbulance error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

async function getAmbulanceLocation(req, res) {
  try {
    const ambulance = await AmbulanceModel.findById(req.params.id);
    if (!ambulance) return res.status(404).json({ success: false, message: 'Ambulance not found' });

    let latitude = ambulance.current_latitude;
    let longitude = ambulance.current_longitude;
    let fallbackSource = null;

    if (latitude == null || longitude == null) {
      if (ambulance.home_hospital_id) {
        const hospital = await HospitalModel.findById(ambulance.home_hospital_id);
        if (hospital && hospital.latitude != null && hospital.longitude != null) {
          latitude = hospital.latitude;
          longitude = hospital.longitude;
          fallbackSource = 'home_hospital';
        }
      }
    }

    res.json({
      success: true,
      data: {
        latitude,
        longitude,
        last_location_update: ambulance.last_location_update,
        fallback_source: fallbackSource
      }
    });
  } catch (err) {
    console.error('getAmbulanceLocation error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

module.exports = { listAmbulances, createAmbulance, updateLocation, updateStatus, deleteAmbulance, restoreAmbulance, listDeletedAmbulances, getMyAmbulance, getAmbulanceLocation };
