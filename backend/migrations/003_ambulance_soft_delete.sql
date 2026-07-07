ALTER TABLE ambulances
  ADD COLUMN deleted_at TIMESTAMP NULL;

-- Soft-delete support for ambulances. Records with deleted_at set are hidden from active fleet lists
-- and may be recovered within the allowed retention window.
