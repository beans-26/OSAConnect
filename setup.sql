CREATE DATABASE IF NOT EXISTS student_violation_db;
USE student_violation_db;

CREATE TABLE IF NOT EXISTS departments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(10) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role ENUM('Admin', 'Staff', 'Guard') DEFAULT 'Staff',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id VARCHAR(20) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL, -- For Mobile App Login
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100),
    course VARCHAR(100),
    year_level INT,
    department_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id)
);

CREATE TABLE IF NOT EXISTS violations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_record_id INT NOT NULL,
    type VARCHAR(100) NOT NULL,
    severity ENUM('Minor', 'Major', 'Critical') NOT NULL,
    description TEXT,
    evidence_url VARCHAR(255),
    date_committed DATETIME DEFAULT CURRENT_TIMESTAMP,
    recorded_by INT,
    status ENUM('Pending Review', 'Ongoing', 'Completed', 'Archived') DEFAULT 'Pending Review',
    total_hours_required INT DEFAULT 0,
    archived_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_record_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (recorded_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS service_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    violation_id INT NOT NULL,
    hours_rendered INT NOT NULL,
    date_rendered DATE NOT NULL,
    supervisor VARCHAR(100),
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (violation_id) REFERENCES violations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS service_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id VARCHAR(20) NOT NULL,
    violation_id INT NOT NULL,
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    total_minutes INT DEFAULT 0,
    FOREIGN KEY (violation_id) REFERENCES violations(id) ON DELETE CASCADE
);

-- Seed Data (Default passwords: password123)
-- Admin/Staff/Guard passwords should be hashed in production
INSERT INTO departments (name, code) VALUES 
('College of Engineering', 'COE'),
('College of Arts and Sciences', 'CAS'),
('College of Business', 'COB'),
('College of Information Technology', 'CIT');

INSERT INTO users (username, password_hash, full_name, role) VALUES
('Staff01', 'StaffPass', 'OSA Staff One', 'Staff'),
('Guard01', 'GuardPass', 'Security Guard One', 'Guard');

INSERT INTO students (student_id, password_hash, first_name, last_name, email, course, year_level, department_id) VALUES
('Student01', 'StuPass', 'John', 'Doe', 'john@example.com', 'BSCS', 1, 4);
