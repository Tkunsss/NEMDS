CREATE TABLE IF NOT EXISTS driver_devices (
    device_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    device_label VARCHAR(100),
    device_identifier VARCHAR(191) UNIQUE,
    platform ENUM('mobile', 'tablet', 'other') DEFAULT 'mobile',
    is_active BOOLEAN DEFAULT TRUE,
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_driver_devices_active ON driver_devices(is_active);

INSERT INTO driver_devices (user_id, device_label, device_identifier, platform, is_active)
SELECT user_id, CONCAT(full_name, '''s device'), phone_number, 'mobile', TRUE
FROM users u
WHERE u.role = 'driver'
  AND NOT EXISTS (
    SELECT 1
    FROM driver_devices dd
    WHERE dd.user_id = u.user_id
  );
