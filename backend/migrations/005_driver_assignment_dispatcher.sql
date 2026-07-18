ALTER TABLE driver_assignments
    ADD COLUMN assigned_by_user_id INT NULL AFTER ambulance_id,
    ADD CONSTRAINT fk_driver_assignments_assigned_by
    FOREIGN KEY (assigned_by_user_id) REFERENCES users(user_id) ON DELETE SET NULL;

CREATE INDEX idx_driver_assignments_assigned_by ON driver_assignments(assigned_by_user_id);
