-- ============================================================
-- Migration: hospital-scoped dispatchers/drivers + call auto-routing
-- Run this if you already created the database from an earlier schema.sql.
-- Safe to run once; re-running will error on duplicate column, which is fine.
-- ============================================================

USE ncemds;

-- 1. Add hospital_id to users — required for dispatcher/driver roles going
--    forward, NULL for admin/caller. Existing dispatcher/driver rows will
--    have NULL here until you assign them a hospital via the admin app.
ALTER TABLE users
  ADD COLUMN hospital_id INT NULL AFTER role,
  ADD CONSTRAINT fk_users_hospital
    FOREIGN KEY (hospital_id) REFERENCES hospitals(hospital_id) ON DELETE SET NULL;

CREATE INDEX idx_users_hospital ON users(hospital_id);

-- 2. Add assigned_hospital_id to emergency_calls — the auto-routed nearest
--    hospital, computed at submission time. Existing calls will have NULL
--    here; they won't be visible to any hospital-scoped dispatcher until
--    backfilled (see note below) or simply left as historical records.
ALTER TABLE emergency_calls
  ADD COLUMN assigned_hospital_id INT NULL AFTER status,
  ADD CONSTRAINT fk_calls_assigned_hospital
    FOREIGN KEY (assigned_hospital_id) REFERENCES hospitals(hospital_id) ON DELETE SET NULL;

CREATE INDEX idx_calls_assigned_hospital ON emergency_calls(assigned_hospital_id);

-- Optional backfill: assign existing NULL calls to the nearest hospital
-- based on lat/lng. This does a simple flat-Earth approximation (good
-- enough at city scale) since MySQL doesn't have Haversine built in by
-- default. Skip this if you don't care about historical calls.
--
-- UPDATE emergency_calls ec
-- JOIN hospitals h ON h.hospital_id = (
--   SELECT h2.hospital_id FROM hospitals h2
--   ORDER BY POW(h2.latitude - ec.latitude, 2) + POW(h2.longitude - ec.longitude, 2) ASC
--   LIMIT 1
-- )
-- SET ec.assigned_hospital_id = h.hospital_id
-- WHERE ec.assigned_hospital_id IS NULL;
