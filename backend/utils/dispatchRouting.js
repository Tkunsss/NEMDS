function resolveDispatchHospitalId(call, fallbackHospitalId = null) {
  if (call && call.assigned_hospital_id != null) {
    return call.assigned_hospital_id;
  }
  return fallbackHospitalId;
}

function isDispatcherDispatchAllowed(call, dispatcherHospitalId) {
  if (!call) return false;
  if (dispatcherHospitalId == null) return false;
  return Number(call.assigned_hospital_id) === Number(dispatcherHospitalId);
}

function shouldReleaseAmbulanceOnCancel(dispatch) {
  return Boolean(dispatch && dispatch.ambulance_id);
}

module.exports = { resolveDispatchHospitalId, isDispatcherDispatchAllowed, shouldReleaseAmbulanceOnCancel };
