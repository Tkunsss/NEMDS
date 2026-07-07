// src/utils/localHistory.js
// Since callers never log in, "call history" is just a list of emergency IDs
// this device has submitted, kept in localStorage. The backend resolves the
// full records from these IDs — nothing personally identifying is stored
// beyond what's already on the device.

const STORAGE_KEY = 'ncemds_emergency_ids';

export function getStoredEmergencyIds() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addEmergencyId(emergencyId) {
  const current = getStoredEmergencyIds();
  if (current.includes(emergencyId)) return;
  const updated = [emergencyId, ...current].slice(0, 50); // cap so storage doesn't grow unbounded
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}
