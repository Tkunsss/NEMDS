ALTER TABLE dispatches
    ADD COLUMN driver_user_id INT NULL AFTER ambulance_id;

CREATE INDEX idx_dispatches_driver ON dispatches(driver_user_id);
