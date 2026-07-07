-- ============================================================
-- Migration: emergency_id + caller live location tracking
-- Run this if you already created the database from the original schema.sql.
-- Safe to run once; re-running will error on duplicate column/table, which is fine.
-- ============================================================

USE ncemds;

-- 1. Add emergency_id to existing emergency_calls table
ALTER TABLE emergency_calls
  ADD COLUMN emergency_id VARCHAR(20) NULL AFTER call_id;

-- Backfill existing rows with a generated ID before making it unique + required
UPDATE emergency_calls
  SET emergency_id = CONCAT('EMG-', LPAD(call_id, 6, '0'))
  WHERE emergency_id IS NULL;

ALTER TABLE emergency_calls
  MODIFY COLUMN emergency_id VARCHAR(20) NOT NULL,
  ADD UNIQUE INDEX idx_calls_emergency_id (emergency_id);

-- 2. caller_phone is no longer required (no login/signup for callers)
ALTER TABLE emergency_calls
  MODIFY COLUMN caller_phone VARCHAR(20) NULL;

-- 3. latitude/longitude are now required (map confirm step happens before submit)
--    Only safe to enforce NOT NULL if no existing rows have NULL coordinates.
--    If this fails, clean up old rows first or skip this step.
ALTER TABLE emergency_calls
  MODIFY COLUMN latitude DECIMAL(10,7) NOT NULL,
  MODIFY COLUMN longitude DECIMAL(10,7) NOT NULL;

-- 4. New table for continuous live location updates from the caller's device
CREATE TABLE IF NOT EXISTS caller_location_pings (
    ping_id INT AUTO_INCREMENT PRIMARY KEY,
    call_id INT NOT NULL,
    latitude DECIMAL(10,7) NOT NULL,
    longitude DECIMAL(10,7) NOT NULL,
    accuracy_meters DECIMAL(6,2) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (call_id) REFERENCES emergency_calls(call_id) ON DELETE CASCADE
);

CREATE INDEX idx_location_pings_call ON caller_location_pings(call_id);
