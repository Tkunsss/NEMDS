// controllers/callController.js
const CallModel = require('../models/callModel');
const StatusLogModel = require('../models/statusLogModel');
const CallerLocationModel = require('../models/callerLocationModel');
const HospitalModel = require('../models/hospitalModel');
const DispatchModel = require('../models/dispatchModel');
const AmbulanceModel = require('../models/ambulanceModel');
const { findNearest } = require('../utils/distance');
const { shouldReleaseAmbulanceOnCancel } = require('../utils/dispatchRouting');
const { resolveCallerLocation } = require('../utils/callerLocation');

async function requireDriverCall(req, res, callId) {
  if (req.user.role !== 'driver') return true;
  const dispatch = await DispatchModel.findActiveForDriver(req.user.user_id);
  if (!dispatch || Number(dispatch.call_id) !== Number(callId)) {
    res.status(403).json({ success: false, message: 'This call is assigned to another driver' });
    return false;
  }
  return true;
}

// POST /api/calls
// Caller app: submit a new emergency. No login or phone number required —
// the caller has already confirmed their location on the map before this
// fires. Returns the generated emergency_id, which is the caller's only
// reference to this call going forward.
//
// The call is auto-routed to the nearest hospital at submission time —
// that hospital's dispatcher is the only one who will see this call. If no
// hospital has coordinates (or none exist yet), assigned_hospital_id stays
// NULL and the call shows up in admin's "unassigned calls" view instead of
// silently vanishing.
async function createCall(req, res) {
  try {
    const {
      caller_phone = null,       // optional now — caller may provide it, but it's not required
      emergency_type = 'medical',
      severity = 'unknown',
      description,
      latitude,
      longitude,
      address_text
    } = req.body;

    if (latitude === undefined || latitude === null || longitude === undefined || longitude === null) {
      return res.status(400).json({ success: false, message: 'A confirmed location is required before submitting' });
    }

    const caller_user_id = req.user ? req.user.user_id : null;

    const allHospitals = await HospitalModel.findAll();
    const nearest = findNearest(allHospitals, latitude, longitude, { latKey: 'latitude', lngKey: 'longitude' });
    const assigned_hospital_id = nearest ? nearest.hospital_id : null;

    const { call_id, emergency_id } = await CallModel.create({
      caller_user_id,
      caller_phone,
      emergency_type,
      severity,
      description,
      latitude,
      longitude,
      address_text,
      assigned_hospital_id
    });

    await StatusLogModel.add({
      call_id,
      status: 'pending',
      note: assigned_hospital_id ? `Routed to ${nearest.name}` : 'Could not auto-route — no hospital with coordinates available',
      changed_by_user_id: caller_user_id
    });

    // First location ping is the confirmed submission point itself, so the
    // live trail has a starting position immediately.
    await CallerLocationModel.addPing({ call_id, latitude, longitude });

    const call = await CallModel.findById(call_id);

    // TODO: emit socket.io event here so the assigned hospital's dispatcher sees it live
    // io.to(`hospital_${assigned_hospital_id}`).emit('new_call', call);

    res.status(201).json({ success: true, data: call });
  } catch (err) {
    console.error('createCall error:', err);
    res.status(500).json({ success: false, message: 'Server error creating call' });
  }
}

// GET /api/calls/:id
// Accepts either a numeric call_id or an emergency_id (e.g. "EMG-7K3F9Q") —
// the caller app only ever knows the emergency_id, dispatcher/driver apps use call_id.
async function getCall(req, res) {
  try {
    const identifier = req.params.id;
    const call = /^\d+$/.test(identifier)
      ? await CallModel.findById(identifier)
      : await CallModel.findByEmergencyId(identifier);

    if (!call) return res.status(404).json({ success: false, message: 'Call not found' });

    const timeline = await StatusLogModel.findByCall(call.call_id);
    const latestLocation = await CallerLocationModel.findLatest(call.call_id);
    const resolvedLocation = resolveCallerLocation(call, latestLocation);
    res.json({ success: true, data: { ...call, timeline, latest_location: latestLocation, resolved_location: resolvedLocation } });
  } catch (err) {
    console.error('getCall error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

// GET /api/calls/mine?ids=EMG-AAA111,EMG-BBB222
// Caller app has no login, so call history lives in browser storage as a
// list of emergency IDs. This batch-resolves them into full call records.
async function getMyCalls(req, res) {
  try {
    const idsParam = req.query.ids;
    if (!idsParam) {
      return res.json({ success: true, data: [] });
    }
    const emergencyIds = idsParam.split(',').map((s) => s.trim()).filter(Boolean);
    const calls = await CallModel.findByEmergencyIds(emergencyIds);
    res.json({ success: true, data: calls });
  } catch (err) {
    console.error('getMyCalls error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

// GET /api/calls  (dispatcher/admin: list with optional status filter)
// Dispatchers only ever see calls routed to their own hospital. Admin sees
// everything system-wide (req.user.hospital_id is null for admin accounts).
async function listCalls(req, res) {
  try {
    const { status } = req.query;
    const hospital_id = req.user.role === 'dispatcher' ? req.user.hospital_id : null;

    let calls;
    if (status === 'pending') {
      calls = await CallModel.findPending(hospital_id);
    } else if (status === 'active') {
      calls = await CallModel.findActive(hospital_id);
    } else {
      calls = await CallModel.findAll({ hospital_id });
    }
    res.json({ success: true, data: calls });
  } catch (err) {
    console.error('listCalls error:', err.stack || err);
    const devMessage = process.env.NODE_ENV === 'production' ? 'Server error' : (err.message || 'Server error');
    res.status(500).json({ success: false, message: devMessage });
  }
}

// PATCH /api/calls/:id/status  (dispatcher/driver update status)
async function updateCallStatus(req, res) {
  try {
    const { status, note } = req.body;
    const validStatuses = ['pending', 'assigned', 'en_route', 'on_scene', 'transporting', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value' });
    }

    // Defense in depth: dispatchers can only update calls routed to their
    // hospital, and drivers can only update the call currently assigned to
    // their active dispatch.
    if (req.user.role === 'dispatcher') {
      const existing = await CallModel.findById(req.params.id);
      if (!existing) return res.status(404).json({ success: false, message: 'Call not found' });
      if (existing.assigned_hospital_id !== req.user.hospital_id) {
        return res.status(403).json({ success: false, message: 'This call is not assigned to your hospital' });
      }
    }
    if (!(await requireDriverCall(req, res, req.params.id))) return;

    await CallModel.updateStatus(req.params.id, status);
    await StatusLogModel.add({
      call_id: req.params.id,
      status,
      note,
      changed_by_user_id: req.user ? req.user.user_id : null
    });

    const call = await CallModel.findById(req.params.id);

    // TODO: io.emit so caller app's live tracking screen updates instantly

    res.json({ success: true, data: call });
  } catch (err) {
    console.error('updateCallStatus error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

// PATCH /api/calls/:id/cancel  (caller cancels their own call)
async function cancelCall(req, res) {
  try {
    const callId = req.params.id;
    const dispatch = await DispatchModel.findByCall(callId);

    await CallModel.cancel(callId);

    if (shouldReleaseAmbulanceOnCancel(dispatch)) {
      await AmbulanceModel.updateStatus(dispatch.ambulance_id, 'available');
    }

    await StatusLogModel.add({
      call_id: callId,
      status: 'cancelled',
      note: shouldReleaseAmbulanceOnCancel(dispatch)
        ? 'Cancelled by caller; ambulance released to available'
        : 'Cancelled by caller',
      changed_by_user_id: req.user ? req.user.user_id : null
    });
    res.json({ success: true, message: 'Call cancelled' });
  } catch (err) {
    console.error('cancelCall error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

// POST /api/calls/:id/location
// Caller app: streams continuous live location updates after submission.
async function addLocationPing(req, res) {
  try {
    const { latitude, longitude, accuracy_meters } = req.body;
    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ success: false, message: 'latitude and longitude are required' });
    }

    const call = await CallModel.findById(req.params.id);
    if (!call) return res.status(404).json({ success: false, message: 'Call not found' });

    await CallerLocationModel.addPing({ call_id: call.call_id, latitude, longitude, accuracy_meters });

    // TODO: io.emit to dispatcher + assigned driver rooms so the map updates live

    res.status(201).json({ success: true, message: 'Location updated' });
  } catch (err) {
    console.error('addLocationPing error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

// GET /api/calls/:id/location
// Dispatcher/driver: get the caller's most recent known position.
async function getLatestLocation(req, res) {
  try {
    const call = await CallModel.findById(req.params.id);
    if (!call) return res.status(404).json({ success: false, message: 'Call not found' });
    if (!(await requireDriverCall(req, res, call.call_id))) return;

    const latest = await CallerLocationModel.findLatest(call.call_id);
    const resolvedLocation = resolveCallerLocation(call, latest);
    res.json({ success: true, data: resolvedLocation });
  } catch (err) {
    console.error('getLatestLocation error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

// GET /api/calls/unassigned  (admin only: calls with no hospital match, e.g. none had coordinates)
async function getUnassignedCalls(req, res) {
  try {
    const calls = await CallModel.findUnassigned();
    res.json({ success: true, data: calls });
  } catch (err) {
    console.error('getUnassignedCalls error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

module.exports = {
  createCall, getCall, getMyCalls, listCalls, updateCallStatus, cancelCall,
  addLocationPing, getLatestLocation, getUnassignedCalls
};
