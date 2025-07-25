-- Migration script to update database schema
-- This script will migrate from old table names to new ones

-- First, create the new tables if they don't exist
CREATE TABLE IF NOT EXISTS offices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  location VARCHAR(255) DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS positions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS office_positions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  office_id INT NOT NULL,
  position_id INT NOT NULL,
  reporting_time TIME NOT NULL DEFAULT '09:00:00',
  duty_hours DECIMAL(3,1) NOT NULL DEFAULT 8.0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (office_id) REFERENCES offices(id) ON DELETE CASCADE,
  FOREIGN KEY (position_id) REFERENCES positions(id) ON DELETE CASCADE,
  UNIQUE KEY unique_office_position (office_id, position_id)
);

-- Migrate data from old tables to new ones if they exist
INSERT IGNORE INTO offices (name, location)
SELECT name, '' as location FROM OfficeMaster 
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'OfficeMaster');

INSERT IGNORE INTO positions (title, description)
SELECT name, '' as description FROM PositionMaster 
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'PositionMaster');

-- Migrate office_positions data
INSERT IGNORE INTO office_positions (office_id, position_id, reporting_time, duty_hours)
SELECT 
    o.id as office_id,
    p.id as position_id,
    op.reporting_time,
    op.duty_hours
FROM OfficePositions op
JOIN offices o ON o.name = (SELECT name FROM OfficeMaster WHERE id = op.office_id)
JOIN positions p ON p.title = (SELECT name FROM PositionMaster WHERE id = op.position_id)
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'OfficePositions');

-- Insert default sample data if tables are empty
INSERT IGNORE INTO offices (name, location) VALUES 
('New York', 'NY, USA'),
('Los Angeles', 'CA, USA'),
('Chicago', 'IL, USA'),
('Houston', 'TX, USA'),
('Dubai', 'UAE');

INSERT IGNORE INTO positions (title, description) VALUES 
('Software Engineer', 'Develop and maintain software applications'),
('Data Analyst', 'Analyze and interpret data to support business decisions'),
('Product Manager', 'Manage product development and strategy'),
('Designer', 'Create visual designs and user interfaces'),
('HR Specialist', 'Manage human resources and employee relations');

-- Insert some sample office-position relationships
INSERT IGNORE INTO office_positions (office_id, position_id, reporting_time, duty_hours) VALUES 
-- New York Office
((SELECT id FROM offices WHERE name = 'New York'), (SELECT id FROM positions WHERE title = 'Software Engineer'), '09:00:00', 8.0),
((SELECT id FROM offices WHERE name = 'New York'), (SELECT id FROM positions WHERE title = 'Data Analyst'), '09:00:00', 8.0),
((SELECT id FROM offices WHERE name = 'New York'), (SELECT id FROM positions WHERE title = 'Product Manager'), '10:00:00', 7.0),

-- Dubai Office
((SELECT id FROM offices WHERE name = 'Dubai'), (SELECT id FROM positions WHERE title = 'Data Analyst'), '08:30:00', 8.5),
((SELECT id FROM offices WHERE name = 'Dubai'), (SELECT id FROM positions WHERE title = 'Software Engineer'), '09:00:00', 8.0),
((SELECT id FROM offices WHERE name = 'Dubai'), (SELECT id FROM positions WHERE title = 'HR Specialist'), '09:00:00', 8.0);
