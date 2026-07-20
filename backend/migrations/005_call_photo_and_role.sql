ALTER TABLE emergency_calls
  ADD COLUMN caller_role VARCHAR(100) NULL,
  ADD COLUMN photo_data TEXT NULL,
  ADD COLUMN photo_name VARCHAR(255) NULL;
