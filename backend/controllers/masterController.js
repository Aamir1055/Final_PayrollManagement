const { query } = require('../utils/dbPromise');

// ================ OFFICE CONTROLLERS ================

// Get all offices
exports.getAllOffices = async (req, res) => {
  try {
    const results = await query(`
      SELECT 
        o.id as office_id,
        o.name as office_name,
        o.location,
        COALESCE(emp_summary.employeeCount, 0) as employeeCount,
        COALESCE(emp_summary.totalSalary, 0) as totalSalary,
        o.created_at
      FROM offices o
      LEFT JOIN (
        SELECT 
          office_id, 
          COUNT(*) AS employeeCount, 
          SUM(monthlySalary) AS totalSalary 
        FROM employees 
        WHERE status = 1
        GROUP BY office_id
      ) emp_summary ON o.id = emp_summary.office_id
      ORDER BY o.name
    `);
    res.json(results);
  } catch (err) {
    console.error('Error fetching offices:', err);
    res.status(500).json({ error: err.message });
  }
};

// Create a new office
exports.createOffice = async (req, res) => {
  try {
    const { name, location } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Office name is required' });
    }
    
    const result = await query(
      'INSERT INTO offices (name, location) VALUES (?, ?)', 
      [name, location || '']
    );
    
    res.status(201).json({ 
      id: result.insertId, 
      name, 
      location: location || '',
      message: 'Office created successfully'
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Office name already exists' });
    }
    console.error('Error creating office:', err);
    res.status(500).json({ error: err.message });
  }
};

// Update an office
exports.updateOffice = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, location } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Office name is required' });
    }
    
    const result = await query(
      'UPDATE offices SET name = ?, location = ? WHERE id = ?', 
      [name, location || '', id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Office not found' });
    }
    
    res.json({ 
      id: parseInt(id), 
      name, 
      location: location || '',
      message: 'Office updated successfully'
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Office name already exists' });
    }
    console.error('Error updating office:', err);
    res.status(500).json({ error: err.message });
  }
};

// Delete an office
exports.deleteOffice = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if office has employees
    const employeeCheck = await query(
      'SELECT COUNT(*) as count FROM employees WHERE office_id = ?', 
      [id]
    );
    
    if (employeeCheck[0].count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete office with active employees. Please reassign employees first.' 
      });
    }
    
    const result = await query('DELETE FROM offices WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Office not found' });
    }
    
    res.json({ message: 'Office deleted successfully' });
  } catch (err) {
    console.error('Error deleting office:', err);
    res.status(500).json({ error: err.message });
  }
};

// Create office with positions - simplified version
exports.createOfficeWithPositions = async (req, res) => {
  try {
    const { officeName, location, positions } = req.body;
    
    if (!officeName) {
      return res.status(400).json({ error: 'Office name is required' });
    }

    // Create office first
    const officeResult = await query(
      'INSERT INTO offices (name, location) VALUES (?, ?)', 
      [officeName, location || '']
    );

    res.status(201).json({
      message: 'Office created successfully',
      officeId: officeResult.insertId,
      officeName,
      location: location || ''
    });
  } catch (err) {
    console.error('Error creating office with positions:', err);
    res.status(500).json({ error: err.message });
  }
};

// Get office positions with schedules
exports.getOfficePositions = async (req, res) => {
  try {
    const results = await query(`
      SELECT 
        o.id as office_id,
        o.name as office_name,
        o.location,
        p.id as position_id,
        p.title as position_name,
        op.reporting_time,
        op.duty_hours
      FROM offices o
      LEFT JOIN office_positions op ON o.id = op.office_id
      LEFT JOIN positions p ON op.position_id = p.id
      ORDER BY o.name, p.title
    `);
    
    // Group by office
    const groupedData = {};
    results.forEach(row => {
      if (!groupedData[row.office_name]) {
        groupedData[row.office_name] = {
          office_id: row.office_id,
          office_name: row.office_name,
          location: row.location,
          positions: []
        };
      }
      
      if (row.position_name) {
        groupedData[row.office_name].positions.push({
          position_id: row.position_id,
          position_name: row.position_name,
          reporting_time: row.reporting_time,
          duty_hours: row.duty_hours
        });
      }
    });
    
    res.json(Object.values(groupedData));
  } catch (err) {
    console.error('Error fetching office positions:', err);
    res.status(500).json({ error: err.message });
  }
};

// Get office position details
exports.getOfficePositionDetails = async (req, res) => {
  try {
    const { officeId, positionId } = req.params;
    
    const results = await query(`
      SELECT 
        op.reporting_time,
        op.duty_hours,
        o.name as office_name,
        p.title as position_name
      FROM office_positions op
      JOIN offices o ON op.office_id = o.id
      JOIN positions p ON op.position_id = p.id
      WHERE op.office_id = ? AND op.position_id = ?
    `, [officeId, positionId]);
    
    if (results.length === 0) {
      return res.status(404).json({ error: 'Office-Position combination not found' });
    }
    
    res.json(results[0]);
  } catch (err) {
    console.error('Error fetching office position details:', err);
    res.status(500).json({ error: err.message });
  }
};

// ================ POSITION CONTROLLERS ================

// Get all positions
exports.getAllPositions = async (req, res) => {
  try {
    const results = await query(`
      SELECT 
        p.id as position_id,
        p.title as position_name,
        p.description,
        op.office_id,
        o.name as office_name,
        op.reporting_time,
        op.duty_hours
      FROM positions p
      LEFT JOIN office_positions op ON p.id = op.position_id
      LEFT JOIN offices o ON op.office_id = o.id
      ORDER BY p.title
    `);
    res.json(results);
  } catch (err) {
    console.error('Error fetching positions:', err);
    res.status(500).json({ error: err.message });
  }
};

// Create a new position
exports.createPosition = async (req, res) => {
  try {
    const { title, description, office_id, reporting_time, duty_hours } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: 'Position title is required' });
    }
    
    // Check if position exists
    let posResult = await query('SELECT id FROM positions WHERE title = ?', [title]);
    let positionId;
    
    if (posResult.length > 0) {
      positionId = posResult[0].id;
    } else {
      // Create new position
      const newPosResult = await query(
        'INSERT INTO positions (title, description) VALUES (?, ?)', 
        [title, description || '']
      );
      positionId = newPosResult.insertId;
    }
    
    // If office_id is provided, create office-position relationship
    if (office_id && reporting_time && duty_hours) {
      await query(`
        INSERT INTO office_positions (office_id, position_id, reporting_time, duty_hours)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
        reporting_time = VALUES(reporting_time),
        duty_hours = VALUES(duty_hours)
      `, [office_id, positionId, reporting_time, duty_hours]);
    }
    
    res.status(201).json({ 
      id: positionId, 
      title, 
      description: description || '',
      office_id: office_id || null,
      reporting_time: reporting_time || null,
      duty_hours: duty_hours || null,
      message: 'Position created successfully'
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Position title already exists' });
    }
    console.error('Error creating position:', err);
    res.status(500).json({ error: err.message });
  }
};

// Update a position
exports.updatePosition = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, office_id, reporting_time, duty_hours } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: 'Position title is required' });
    }
    
    // Update the position basic info
    const result = await query(
      'UPDATE positions SET title = ?, description = ? WHERE id = ?', 
      [title, description || '', id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Position not found' });
    }
    
    // Update office-position relationship if office_id is provided
    if (office_id && reporting_time && duty_hours) {
      await query(`
        INSERT INTO office_positions (office_id, position_id, reporting_time, duty_hours)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
        reporting_time = VALUES(reporting_time),
        duty_hours = VALUES(duty_hours)
      `, [office_id, id, reporting_time, duty_hours]);
    }
    
    res.json({ 
      id: parseInt(id), 
      title, 
      description: description || '',
      office_id: office_id || null,
      reporting_time: reporting_time || null,
      duty_hours: duty_hours || null,
      message: 'Position updated successfully'
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Position title already exists' });
    }
    console.error('Error updating position:', err);
    res.status(500).json({ error: err.message });
  }
};

// Delete a position
exports.deletePosition = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if position has employees
    const employeeCheck = await query(
      'SELECT COUNT(*) as count FROM employees WHERE position_id = ?', 
      [id]
    );
    
    if (employeeCheck[0].count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete position with active employees. Please reassign employees first.' 
      });
    }
    
    // Delete office-position relationships first
    await query('DELETE FROM office_positions WHERE position_id = ?', [id]);
    
    const result = await query('DELETE FROM positions WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Position not found' });
    }
    
    res.json({ message: 'Position deleted successfully' });
  } catch (err) {
    console.error('Error deleting position:', err);
    res.status(500).json({ error: err.message });
  }
};

// Create office-specific position with schedule
exports.createOfficeSpecificPosition = async (req, res) => {
  try {
    const { officeName, positionName, reportingTime, dutyHours } = req.body;
    
    if (!officeName || !positionName || !reportingTime || !dutyHours) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // First, get office ID
    const officeResult = await query('SELECT id FROM offices WHERE name = ?', [officeName]);
    
    if (officeResult.length === 0) {
      return res.status(404).json({ error: 'Office not found' });
    }
    
    const officeId = officeResult[0].id;
    
    // Check if position exists, if not create it
    let posResult = await query('SELECT id FROM positions WHERE title = ?', [positionName]);
    let positionId;
    
    if (posResult.length > 0) {
      positionId = posResult[0].id;
    } else {
      // Create new position
      const newPosResult = await query('INSERT INTO positions (title) VALUES (?)', [positionName]);
      positionId = newPosResult.insertId;
    }
    
    // Create office-position relationship
    await query(`
      INSERT INTO office_positions (office_id, position_id, reporting_time, duty_hours)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
      reporting_time = VALUES(reporting_time),
      duty_hours = VALUES(duty_hours)
    `, [officeId, positionId, reportingTime, dutyHours]);
    
    res.status(201).json({ 
      message: 'Office-Position relationship created/updated successfully',
      officeName,
      positionName,
      reportingTime,
      dutyHours
    });
  } catch (err) {
    console.error('Error creating office-specific position:', err);
    res.status(500).json({ error: err.message });
  }
};

// ================ DASHBOARD CONTROLLERS ================

// Dashboard summary
exports.getDashboardSummary = async (req, res) => {
  try {
    const summaryQuery = `
      SELECT 
        (SELECT COUNT(*) FROM offices) as totalOffices,
        (SELECT COUNT(*) FROM positions) as totalPositions,
        (SELECT COUNT(*) FROM employees WHERE status = 1) as totalEmployees,
        (SELECT COALESCE(SUM(monthlySalary), 0) FROM employees WHERE status = 1) as totalSalary
    `;
    
    const result = await query(summaryQuery);
    res.json(result[0]);
  } catch (err) {
    console.error('Error fetching dashboard summary:', err);
    res.status(500).json({ error: err.message });
  }
};
