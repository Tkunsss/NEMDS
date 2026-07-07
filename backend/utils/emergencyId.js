// utils/emergencyId.js

// Generates a short, human-readable, collision-resistant emergency ID
// shown to the caller right after they submit, e.g. "EMG-7K3F9Q".
// Not a database primary key — call_id stays the real PK — this is purely
// the human-facing reference number a caller might read aloud over the phone.
function generateEmergencyId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I to avoid confusion when read aloud
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return `EMG-${code}`;
}

module.exports = { generateEmergencyId };
