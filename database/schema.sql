-- Smart Campus Complaint System - MySQL schema
-- WARNING: re-running this file drops and recreates every table.
CREATE DATABASE IF NOT EXISTS smart_campus CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE smart_campus;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS complaint_supporters, notifications, feedback, resolutions, assignments,
  complaint_status_history, complaints, sla_settings, locations, categories, students, users, departments;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE departments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('STUDENT','ADMIN','STAFF') NOT NULL,
  department_id INT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_users_role (role),
  CONSTRAINT fk_users_dept FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE students (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  student_id VARCHAR(30) NOT NULL UNIQUE,
  department VARCHAR(100) NOT NULL,
  year TINYINT NOT NULL,
  CONSTRAINT fk_students_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  department_id INT NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  CONSTRAINT fk_cat_dept FOREIGN KEY (department_id) REFERENCES departments(id)
) ENGINE=InnoDB;

CREATE TABLE locations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  campus VARCHAR(100) NOT NULL DEFAULT 'Main Campus',
  building VARCHAR(100) NOT NULL,
  floor VARCHAR(50) NOT NULL,
  room VARCHAR(100) NULL,
  area VARCHAR(100) NULL,
  INDEX idx_loc_building (building, floor)
) ENGINE=InnoDB;

CREATE TABLE sla_settings (
  priority ENUM('Low','Medium','High') PRIMARY KEY,
  hours INT NOT NULL
) ENGINE=InnoDB;

CREATE TABLE complaints (
  id INT AUTO_INCREMENT PRIMARY KEY,
  complaint_code VARCHAR(20) UNIQUE,
  student_id INT NOT NULL,
  title VARCHAR(150) NOT NULL,
  description TEXT NOT NULL,
  photo_url VARCHAR(255) NULL,
  location_id INT NOT NULL,
  category_id INT NOT NULL,
  priority ENUM('Low','Medium','High') NOT NULL DEFAULT 'Medium',
  status ENUM('Submitted','Under Review','Assigned','In Progress','Resolved','Closed','Reopened') NOT NULL DEFAULT 'Submitted',
  assigned_department_id INT NULL,
  assigned_staff_id INT NULL,
  escalated TINYINT(1) NOT NULL DEFAULT 0,
  escalated_at DATETIME NULL,
  reopened_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  resolved_at DATETIME NULL,
  closed_at DATETIME NULL,
  INDEX idx_c_status (status),
  INDEX idx_c_category (category_id),
  INDEX idx_c_location (location_id),
  INDEX idx_c_priority (priority),
  INDEX idx_c_student (student_id),
  INDEX idx_c_staff (assigned_staff_id),
  INDEX idx_c_created (created_at),
  CONSTRAINT fk_c_student FOREIGN KEY (student_id) REFERENCES students(id),
  CONSTRAINT fk_c_location FOREIGN KEY (location_id) REFERENCES locations(id),
  CONSTRAINT fk_c_category FOREIGN KEY (category_id) REFERENCES categories(id),
  CONSTRAINT fk_c_dept FOREIGN KEY (assigned_department_id) REFERENCES departments(id) ON DELETE SET NULL,
  CONSTRAINT fk_c_staff FOREIGN KEY (assigned_staff_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=100;

CREATE TABLE complaint_status_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  complaint_id INT NOT NULL,
  old_status VARCHAR(20) NULL,
  new_status VARCHAR(20) NOT NULL,
  changed_by INT NULL,
  remarks TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_h_complaint (complaint_id, created_at),
  CONSTRAINT fk_h_complaint FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
  CONSTRAINT fk_h_user FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE assignments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  complaint_id INT NOT NULL,
  assigned_to INT NOT NULL,
  assigned_by INT NOT NULL,
  assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_a_complaint (complaint_id),
  INDEX idx_a_to (assigned_to),
  CONSTRAINT fk_a_complaint FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
  CONSTRAINT fk_a_to FOREIGN KEY (assigned_to) REFERENCES users(id),
  CONSTRAINT fk_a_by FOREIGN KEY (assigned_by) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE resolutions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  complaint_id INT NOT NULL,
  description TEXT NOT NULL,
  proof_photo_url VARCHAR(255) NULL,
  resolved_by INT NULL,
  resolved_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_r_complaint (complaint_id),
  CONSTRAINT fk_r_complaint FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
  CONSTRAINT fk_r_user FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE feedback (
  id INT AUTO_INCREMENT PRIMARY KEY,
  complaint_id INT NOT NULL UNIQUE,
  student_id INT NOT NULL,
  rating TINYINT NOT NULL,
  comment VARCHAR(500) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_rating CHECK (rating BETWEEN 1 AND 5),
  CONSTRAINT fk_f_complaint FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
  CONSTRAINT fk_f_student FOREIGN KEY (student_id) REFERENCES students(id)
) ENGINE=InnoDB;

CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  complaint_id INT NULL,
  message VARCHAR(255) NOT NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_n_user (user_id, is_read, created_at),
  CONSTRAINT fk_n_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_n_complaint FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE complaint_supporters (
  complaint_id INT NOT NULL,
  student_id INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (complaint_id, student_id),
  CONSTRAINT fk_s_complaint FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
  CONSTRAINT fk_s_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------- Reference data the app needs to function ----------
INSERT INTO departments (name) VALUES
 ('Electrical Department'), ('IT Department'), ('Housekeeping'), ('Civil/Maintenance'),
 ('Lab Maintenance'), ('Plumbing Department'), ('Maintenance Department'),
 ('Security Department'), ('General Administration');

INSERT INTO categories (name, department_id) VALUES
 ('Electrical',           (SELECT id FROM departments WHERE name='Electrical Department')),
 ('Internet/Wi-Fi',       (SELECT id FROM departments WHERE name='IT Department')),
 ('Cleanliness',          (SELECT id FROM departments WHERE name='Housekeeping')),
 ('Infrastructure',       (SELECT id FROM departments WHERE name='Civil/Maintenance')),
 ('Laboratory Equipment', (SELECT id FROM departments WHERE name='Lab Maintenance')),
 ('Water/Plumbing',       (SELECT id FROM departments WHERE name='Plumbing Department')),
 ('Furniture',            (SELECT id FROM departments WHERE name='Maintenance Department')),
 ('Security',             (SELECT id FROM departments WHERE name='Security Department')),
 ('Other',                (SELECT id FROM departments WHERE name='General Administration'));

INSERT INTO sla_settings (priority, hours) VALUES ('High', 24), ('Medium', 72), ('Low', 168);
