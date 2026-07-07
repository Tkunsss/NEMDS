USE ncemds;

CREATE TABLE IF NOT EXISTS ambulance_tracking (
    tracking_id INT AUTO_INCREMENT PRIMARY KEY,
    dispatch_id INT NOT NULL,
    ambulance_id INT NOT NULL,
    driver_user_id INT NOT NULL,
    call_id INT NOT NULL,
    latitude DECIMAL(10,7) NOT NULL,
    longitude DECIMAL(10,7) NOT NULL,
    status ENUM('available', 'dispatched', 'en_route', 'at_scene', 'transporting', 'out_of_service') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (dispatch_id) REFERENCES dispatches(dispatch_id) ON DELETE CASCADE,
    FOREIGN KEY (ambulance_id) REFERENCES ambulances(ambulance_id) ON DELETE CASCADE,
    FOREIGN KEY (driver_user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (call_id) REFERENCES emergency_calls(call_id) ON DELETE CASCADE
);

CREATE INDEX idx_ambulance_tracking_dispatch ON ambulance_tracking(dispatch_id);
CREATE INDEX idx_ambulance_tracking_call ON ambulance_tracking(call_id);
CREATE INDEX idx_ambulance_tracking_ambulance ON ambulance_tracking(ambulance_id);
