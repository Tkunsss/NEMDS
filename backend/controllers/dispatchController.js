// controllers/dispatchController.js
const DispatchModel = require('../models/dispatchModel');
const CallModel = require('../models/callModel');
const AmbulanceModel = require('../models/ambulanceModel');
const StatusLogModel = require('../models/statusLogModel');
const DriverAssignmentModel = require('../models/driverAssignmentModel');
const { resolveDispatchHospitalId, isDispatcherDispatchAllowed } = require('../utils/dispatchRouting');

// POST /api/dispatches  (dispatcher assigns an ambulance to a call)
async function createDispatch(req, res) {
  try {
    const { call_id, ambulance_id, notes } = req.body;

    if (!call_id || !ambulance_id) {
      return res.status(400).json({ success: false, message: 'call_id and ambulance_id are required' });
    }

    const existingCall = await CallModel.findById(call_id);
    if (!existingCall) {
      return res.status(404).json({ success: false, message: 'Call not found' });
    }

    if (req.user.role === 'dispatcher') {
      if (!isDispatcherDispatchAllowed(existingCall, req.user.hospital_id)) {
        return res.status(403).json({ success: false, message: 'This call is not assigned to your hospital' });
      }
    }

    const resolvedHospitalId = resolveDispatchHospitalId(existingCall, req.user.hospital_id);
    const ambulance = await AmbulanceModel.findById(ambulance_id);
    if (!ambulance) return res.status(404).json({ success: false, message: 'Ambulance not found' });
    if (req.user.role === 'dispatcher' && ambulance.home_hospital_id !== req.user.hospital_id) {
      return res.status(403).json({ success: false, message: 'This ambulance is not assigned to your hospital' });
    }
    if (ambulance.status !== 'available') {
      return res.status(409).json({ success: false, message: 'Ambulance is not available' });
    }

    const driverAssignment = await DriverAssignmentModel.findCurrentByAmbulance(ambulance_id);
    if (!driverAssignment) {
      return res.status(409).json({ success: false, message: 'This ambulance has no driver assigned — assign a driver first' });
    }

    const dispatch_id = await DispatchModel.create({
      call_id,
      dispatcher_user_id: req.user.user_id,
      ambulance_id,
      destination_hospital_id: resolvedHospitalId,
      notes
    });

    await AmbulanceModel.updateStatus(ambulance_id, 'dispatched');
    await CallModel.updateStatus(call_id, 'assigned');
    await StatusLogModel.add({
      call_id,
      status: 'assigned',
      note: `Ambulance #${ambulance_id} dispatched`,
      changed_by_user_id: req.user.user_id
    });

    const dispatch = await DispatchModel.findById(dispatch_id);
    const io = req.app.get('io');
    io.to(`caller_${call_id}`).emit('call_status_update', {
      call_id,
      status: 'assigned'
    });

    res.status(201).json({ success: true, data: dispatch });
  } catch (err) {
    console.error('createDispatch error:', err.stack || err);
    const devMessage = process.env.NODE_ENV === 'production' ? 'Server error creating dispatch' : (err.message || 'Server error creating dispatch');
    res.status(500).json({ success: false, message: devMessage });
  }
}

// GET /api/dispatches/call/:callId
async function getDispatchForCall(req, res) {
  try {
    const dispatch = await DispatchModel.findByCall(req.params.callId);
    if (!dispatch) return res.json({ success: true, data: null });
    res.json({ success: true, data: dispatch });
  } catch (err) {
    console.error('getDispatchForCall error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

// GET /api/dispatches/active  (driver app: get my current active dispatch)
async function getActiveDispatchForDriver(req, res) {
  try {
    const dispatch = await DispatchModel.findActiveForDriver(req.user.user_id);
    if (!dispatch) return res.json({ success: true, data: null });
    res.json({ success: true, data: dispatch });
  } catch (err) {
    console.error('getActiveDispatchForDriver error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

// PATCH /api/dispatches/:id/en-route
// Driver presses "On the way" — first status update after accepting a dispatch
async function markEnRoute(req, res) {
  try {
    const dispatch = await DispatchModel.findById(req.params.id);
    if (!dispatch) return res.status(404).json({ success: false, message: 'Dispatch not found' });

    await AmbulanceModel.updateStatus(dispatch.ambulance_id, 'en_route');
    await CallModel.updateStatus(dispatch.call_id, 'en_route');
    await StatusLogModel.add({ call_id: dispatch.call_id, status: 'en_route', changed_by_user_id: req.user.user_id });

    const io = req.app.get('io');
    io.to(`caller_${dispatch.call_id}`).emit('call_status_update', {
      call_id: dispatch.call_id,
      status: 'en_route'
    });

    res.json({ success: true, data: dispatch });
  } catch (err) {
    console.error('markEnRoute error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

// PATCH /api/dispatches/:id/arrived-scene
async function markArrivedScene(req, res) {
  try {
    await DispatchModel.markArrivedScene(req.params.id);
    const dispatch = await DispatchModel.findById(req.params.id);
    await CallModel.updateStatus(dispatch.call_id, 'on_scene');
    await StatusLogModel.add({ call_id: dispatch.call_id, status: 'on_scene', changed_by_user_id: req.user.user_id });

    const io = req.app.get('io');
    io.to(`caller_${dispatch.call_id}`).emit('call_status_update', {
      call_id: dispatch.call_id,
      status: 'on_scene'
    });

    res.json({ success: true, data: dispatch });
  } catch (err) {
    console.error('markArrivedScene error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

// PATCH /api/dispatches/:id/departed-scene
async function markDepartedScene(req, res) {
  try {
    await DispatchModel.markDepartedScene(req.params.id);
    const dispatch = await DispatchModel.findById(req.params.id);
    await CallModel.updateStatus(dispatch.call_id, 'transporting');
    await StatusLogModel.add({ call_id: dispatch.call_id, status: 'transporting', changed_by_user_id: req.user.user_id });

    const io = req.app.get('io');
    io.to(`caller_${dispatch.call_id}`).emit('call_status_update', {
      call_id: dispatch.call_id,
      status: 'transporting'
    });

    res.json({ success: true, data: dispatch });
  } catch (err) {
    console.error('markDepartedScene error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

// PATCH /api/dispatches/:id/arrived-hospital
async function markArrivedHospital(req, res) {
  try {
    await DispatchModel.markArrivedHospital(req.params.id);
    const dispatch = await DispatchModel.findById(req.params.id);
    await CallModel.updateStatus(dispatch.call_id, 'completed');
    await AmbulanceModel.updateStatus(dispatch.ambulance_id, 'available');
    await StatusLogModel.add({ call_id: dispatch.call_id, status: 'completed', changed_by_user_id: req.user.user_id });

    const io = req.app.get('io');
    io.to(`caller_${dispatch.call_id}`).emit('call_status_update', {
      call_id: dispatch.call_id,
      status: 'completed'
    });

    res.json({ success: true, data: dispatch });
  } catch (err) {
    console.error('markArrivedHospital error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

module.exports = {
  createDispatch,
  getDispatchForCall,
  getActiveDispatchForDriver,
  markEnRoute,
  markArrivedScene,
  markDepartedScene,
  markArrivedHospital
};
