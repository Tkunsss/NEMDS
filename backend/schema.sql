-- ============================================================
-- NCEMDS (National Centralized Emergency Medical Dispatch System)
-- Database Schema
-- Covers: Caller app, Dispatcher console, Admin dashboard, Driver app
-- ============================================================

CREATE DATABASE IF NOT EXISTS ncemds CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE ncemds;

-- ============================================================
-- USERS & AUTH and ROLES
-- ============================================================

CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('caller', 'dispatcher', 'admin', 'driver') NOT NULL,
    -- Required for 'dispatcher' and 'driver' roles — both are hospital staff.
    -- NULL for 'admin' (system-wide) and 'caller' (anonymous, unused anyway).
    -- FK added below, after the hospitals table is defined.
    hospital_id INT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- HOSPITALS & AMBULANCES
-- ============================================================

CREATE TABLE hospitals (
    hospital_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    address VARCHAR(255),
    latitude DECIMAL(10,7),
    longitude DECIMAL(10,7),
    phone_number VARCHAR(20),
    capacity_status ENUM('available', 'limited', 'full') DEFAULT 'available',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Now that hospitals exists, wire up the FK declared on users.hospital_id above.
ALTER TABLE users
    ADD CONSTRAINT fk_users_hospital
    FOREIGN KEY (hospital_id) REFERENCES hospitals(hospital_id) ON DELETE SET NULL;

CREATE TABLE ambulances (
    ambulance_id INT AUTO_INCREMENT PRIMARY KEY,
    plate_number VARCHAR(20) UNIQUE NOT NULL,
    vehicle_type ENUM('basic', 'advanced', 'neonatal') DEFAULT 'basic',
    status ENUM('available', 'dispatched', 'en_route', 'at_scene', 'transporting', 'out_of_service') DEFAULT 'available',
    home_hospital_id INT,
    current_latitude DECIMAL(10,7),
    current_longitude DECIMAL(10,7),
    last_location_update TIMESTAMP NULL,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (home_hospital_id) REFERENCES hospitals(hospital_id) ON DELETE SET NULL
);

-- Links a driver (user) to the ambulance they're currently operating
CREATE TABLE driver_assignments (
    assignment_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    ambulance_id INT NOT NULL,
    assigned_by_user_id INT NULL,
    shift_start TIMESTAMP NULL,
    shift_end TIMESTAMP NULL,
    is_current BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_by_user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    FOREIGN KEY (ambulance_id) REFERENCES ambulances(ambulance_id) ON DELETE CASCADE
);

-- One mobile device belongs to one driver account. Dispatchers can assign many
-- drivers across their hospital fleet, and each assigned driver carries their
-- own device identity for the driver app/location stream.
CREATE TABLE driver_devices (
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

-- ============================================================
-- EMERGENCY CALLS & DISPATCH
-- ============================================================

CREATE TABLE emergency_calls (
    call_id INT AUTO_INCREMENT PRIMARY KEY,
    emergency_id VARCHAR(20) UNIQUE NOT NULL,  -- human-readable ID shown to caller, e.g. "EMG-7K3F9Q"
    caller_user_id INT NULL,                  -- nullable: all callers are anonymous now, kept for future use
    caller_phone VARCHAR(20) NULL,             -- now optional — no login/signup required to call
    -- NCEMDS currently handles medical emergencies only. The ENUM keeps
    -- room for future expansion, but every layer above this (validation,
    -- API defaults, UI) locks this to 'medical' for now.
    emergency_type ENUM('medical', 'accident', 'fire_related', 'other') DEFAULT 'medical',
    severity ENUM('critical', 'urgent', 'moderate', 'unknown') DEFAULT 'unknown',
    description TEXT,
    latitude DECIMAL(10,7) NOT NULL,           -- confirmed location is now required (map confirm step)
    longitude DECIMAL(10,7) NOT NULL,
    address_text VARCHAR(255),
    status ENUM('pending', 'assigned', 'en_route', 'on_scene', 'transporting', 'completed', 'cancelled') DEFAULT 'pending',
    -- Auto-computed at submission time: the nearest hospital to the
    -- caller's confirmed location. This is what scopes which hospital's
    -- dispatcher can see/act on this call — NOT the same thing as
    -- dispatches.destination_hospital_id, which is where the ambulance
    -- actually takes the patient (a dispatcher decision, can differ).
    assigned_hospital_id INT NULL,
    ai_classification_label VARCHAR(100) NULL,  -- output from CNN/ML classification placeholder
    ai_confidence DECIMAL(5,2) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (caller_user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_hospital_id) REFERENCES hospitals(hospital_id) ON DELETE SET NULL
);

-- Continuous live location stream from the caller's device, captured after
-- submission so dispatcher + ambulance crew can watch the caller move
-- (e.g. someone walking away from danger, or being moved in transit).
CREATE TABLE caller_location_pings (
    ping_id INT AUTO_INCREMENT PRIMARY KEY,
    call_id INT NOT NULL,
    latitude DECIMAL(10,7) NOT NULL,
    longitude DECIMAL(10,7) NOT NULL,
    accuracy_meters DECIMAL(6,2) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (call_id) REFERENCES emergency_calls(call_id) ON DELETE CASCADE
);

CREATE TABLE dispatches (
    dispatch_id INT AUTO_INCREMENT PRIMARY KEY,
    call_id INT NOT NULL,
    dispatcher_user_id INT NOT NULL,
    ambulance_id INT NOT NULL,
    dispatched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    arrived_at_scene_at TIMESTAMP NULL,
    departed_scene_at TIMESTAMP NULL,
    arrived_hospital_at TIMESTAMP NULL,
    destination_hospital_id INT NULL,
    notes TEXT,
    FOREIGN KEY (call_id) REFERENCES emergency_calls(call_id) ON DELETE CASCADE,
    FOREIGN KEY (dispatcher_user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    FOREIGN KEY (ambulance_id) REFERENCES ambulances(ambulance_id) ON DELETE SET NULL,
    FOREIGN KEY (destination_hospital_id) REFERENCES hospitals(hospital_id) ON DELETE SET NULL
);

-- Status/audit trail for each call (used to drive caller's live tracking screen)
CREATE TABLE call_status_log (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    call_id INT NOT NULL,
    status VARCHAR(50) NOT NULL,
    note VARCHAR(255),
    changed_by_user_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (call_id) REFERENCES emergency_calls(call_id) ON DELETE CASCADE,
    FOREIGN KEY (changed_by_user_id) REFERENCES users(user_id) ON DELETE SET NULL
);

-- Real-time location tracking for ambulances during dispatch
CREATE TABLE ambulance_tracking (
    tracking_id INT AUTO_INCREMENT PRIMARY KEY,
    dispatch_id INT NOT NULL,
    ambulance_id INT NOT NULL,
    driver_user_id INT NULL,
    call_id INT NOT NULL,
    latitude DECIMAL(10,7) NOT NULL,
    longitude DECIMAL(10,7) NOT NULL,
    status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (dispatch_id) REFERENCES dispatches(dispatch_id) ON DELETE CASCADE,
    FOREIGN KEY (ambulance_id) REFERENCES ambulances(ambulance_id) ON DELETE CASCADE,
    FOREIGN KEY (driver_user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    FOREIGN KEY (call_id) REFERENCES emergency_calls(call_id) ON DELETE CASCADE
);

-- ============================================================
-- INDEXES for common query patterns
-- ============================================================

CREATE INDEX idx_calls_status ON emergency_calls(status);
CREATE INDEX idx_calls_created ON emergency_calls(created_at);
CREATE INDEX idx_calls_emergency_id ON emergency_calls(emergency_id);
CREATE INDEX idx_calls_assigned_hospital ON emergency_calls(assigned_hospital_id);
CREATE INDEX idx_users_hospital ON users(hospital_id);
CREATE INDEX idx_ambulances_status ON ambulances(status);
CREATE INDEX idx_driver_devices_active ON driver_devices(is_active);
CREATE INDEX idx_driver_assignments_assigned_by ON driver_assignments(assigned_by_user_id);
CREATE INDEX idx_dispatches_call ON dispatches(call_id);
CREATE INDEX idx_status_log_call ON call_status_log(call_id);
CREATE INDEX idx_location_pings_call ON caller_location_pings(call_id);
CREATE INDEX idx_ambulance_tracking_call ON ambulance_tracking(call_id);
CREATE INDEX idx_ambulance_tracking_ambulance ON ambulance_tracking(ambulance_id);
