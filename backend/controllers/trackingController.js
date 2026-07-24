const AmbulanceTrackingModel = require('../models/ambulanceTrackingModel');
const DispatchModel = require('../models/dispatchModel');
const AmbulanceModel = require('../models/ambulanceModel');
const CallModel = require('../models/callModel');
const HospitalModel = require('../models/hospitalModel');
const { formatCambodiaIsoDateTime } = require('../utils/time');

async function resolveAmbulanceTrackingFallback(ambulanceId) {
  const ambulance = await AmbulanceModel.findById(ambulanceId);
  if (!ambulance) return null;

  if (ambulance.current_latitude != null && ambulance.current_longitude != null) {
    return {
      latitude: ambulance.current_latitude,
      longitude: ambulance.current_longitude,
      source: 'live_ambulance_location',
      last_location_update: ambulance.last_location_update
    };
  }

  if (ambulance.home_hospital_id) {
    const hospital = await HospitalModel.findById(ambulance.home_hospital_id);
    if (hospital && hospital.latitude != null && hospital.longitude != null) {
      return {
        latitude: hospital.latitude,
        longitude: hospital.longitude,
        source: 'home_hospital',
        last_location_update: ambulance.last_location_update
      };
    }
  }

  return null;
}

async function updateAmbulanceTracking(req, res) {
  try {
    const ambulance_id = Number(req.params.id);
    const { latitude, longitude } = req.body;
    if (latitude === undefined || longitude === undefined || latitude === null || longitude === null) {
      return res.status(400).json({ success: false, message: 'latitude and longitude are required' });
    }

    const ambulance = await AmbulanceModel.findById(ambulance_id);
    if (!ambulance) return res.status(404).json({ success: false, message: 'Ambulance not found' });

    const activeDispatch = await DispatchModel.findActiveForAmbulance(ambulance_id);
    if (!activeDispatch) {
      return res.status(409).json({ success: false, message: 'No active dispatch for this ambulance' });
    }

    await AmbulanceModel.updateLocation(ambulance_id, latitude, longitude);
    const status = ambulance.status === 'dispatched' ? 'en_route' : ambulance.status;

    await AmbulanceTrackingModel.add({
      dispatch_id: activeDispatch.dispatch_id,
      ambulance_id,
      driver_user_id: req.user.user_id,
      call_id: activeDispatch.call_id,
      latitude,
      longitude,
      status
    });

    const io = req.app.get('io');
    io.to(`caller_${activeDispatch.call_id}`).emit('ambulance_location_update', {
      ambulance_id,
      call_id: activeDispatch.call_id,
      latitude,
      longitude,
      status,
      timestamp: formatCambodiaIsoDateTime()
    });

    res.json({ success: true, message: 'Tracking update recorded' });
  } catch (err) {
    console.error('updateAmbulanceTracking error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

async function getAmbulanceTrackingForCall(req, res) {
  try {
    let callId = Number(req.params.callId);
    let call = null;
    if (!callId) {
      call = await CallModel.findByEmergencyId(req.params.callId);
      if (!call) return res.status(404).json({ success: false, message: 'Call not found' });
      callId = call.call_id;
    }

    const tracking = await AmbulanceTrackingModel.findLatestByCall(callId);
    if (tracking) {
      return res.json({ success: true, data: tracking });
    }

    res.status(404).json({ success: false, message: 'Driver live location not found' });
  } catch (err) {
    console.error('getAmbulanceTrackingForCall error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

async function getAmbulanceTrackingForAmbulance(req, res) {
  try {
    const ambulanceId = Number(req.params.id);
    const tracking = await AmbulanceTrackingModel.findLatestByAmbulance(ambulanceId);
    if (tracking) {
      return res.json({ success: true, data: tracking });
    }

    const fallback = await resolveAmbulanceTrackingFallback(ambulanceId);
    if (!fallback) return res.status(404).json({ success: false, message: 'Tracking not found' });

    res.json({ success: true, data: { ...fallback, ambulance_id: ambulanceId } });
  } catch (err) {
    console.error('getAmbulanceTrackingForAmbulance error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

module.exports = { updateAmbulanceTracking, getAmbulanceTrackingForCall, getAmbulanceTrackingForAmbulance };
