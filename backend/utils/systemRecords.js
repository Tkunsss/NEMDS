function buildSystemRecords(calls = [], logsByCall = {}) {
  return calls.map((call) => ({
    call_id: call.call_id,
    emergency_id: call.emergency_id,
    caller_phone: call.caller_phone,
    caller_role: call.caller_role || null,
    emergency_type: call.emergency_type,
    status: call.status,
    description: call.description,
    address_text: call.address_text,
    latitude: call.latitude ?? null,
    longitude: call.longitude ?? null,
    assigned_hospital_id: call.assigned_hospital_id,
    created_at: call.created_at,
    timeline: (logsByCall[call.call_id] || []).map((entry) => ({
      log_id: entry.log_id,
      status: entry.status,
      note: entry.note,
      created_at: entry.created_at
    }))
  }));
}

module.exports = { buildSystemRecords };
