const db = require('../db');
const XLSX = require('xlsx');

// Helper: Convert Excel serial date to YYYY-MM-DD
function excelDateToJSDate(serial) {
  // Excel dates are 1-based, JavaScript dates are 0-based, and Excel's epoch is 1900-01-01
  const utcDays = Math.floor(serial - 1);
  const utcValue = utcDays * 86400 * 1000;
  const date = new Date(utcValue);
  // Handle Excel's leap year bug (1900 is not a leap year, but Excel thinks it is)
  if (serial >= 60) {
    date.setUTCDate(date.getUTCDate() + 1);
  }
  return date;
}

// Improved robust date formatter
function formatDateForDB(date) {
  if (!date) return null;

  if (typeof date === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;

    // Support MM/DD/YY or M/D/YY or MM/DD/YYYY formats
    const mdy = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(date);
    if (mdy) {
      let [_, mm, dd, yy] = mdy;
      mm = mm.padStart(2, '0');
      dd = dd.padStart(2, '0');
      // Handle two-digit year as 20xx (assume 2000-2099 window)
      if (yy.length === 2) {
        yy = parseInt(yy, 10);
        yy = (yy < 50) ? (2000 + yy) : (1900 + yy);
      } else {
        yy = parseInt(yy, 10);
      }
      return `${yy}-${mm}-${dd}`;
    }

    // Try Date parser as fallback (for eg. MM-DD-YYYY, etc.)
    const parsedDate = new Date(date);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate.toISOString().split('T')[0];
    }
    return null;
  }

  if (typeof date === 'number' && date > 59 && date < 60000) {
    // Excel serial number conversion
    const jsDate = excelDateToJSDate(date);
    return jsDate.toISOString().split('T')[0];
  }

  if (date instanceof Date && !isNaN(date)) {
    return date.toISOString().split('T')[0];
  }

  // Unsupported format
  return null;
}




exports.upload = async (req, res) => {
  console.log('[Attendance] Upload endpoint hit. File:', req.file?.originalname);
  if (!req.file) {
    console.error('[Attendance] No file uploaded');
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }

  try {
    console.log('[Attendance] Reading Excel file:', req.file.path);
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    console.log('[Attendance] Sheet name:', sheetName);

    // Try to parse all dates as formatted strings
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
      raw: false,         // will parse dates, if cells are typed as dates
      dateNF: 'yyyy-mm-dd' // preferred format for excel dates
    });
    console.log('[Attendance] First row of data:', data[0]);

    const requiredColumns = ['EmployeeID', 'Date', 'Punch In', 'Punch Out'];
    if (data[0]) {
      console.log('[Attendance] Checking for required columns:', requiredColumns);
      for (const col of requiredColumns) {
        if (!(col in data[0])) {
          console.error(`[Attendance] Missing required column: ${col}`);
          throw new Error(`Required column "${col}" not found in Excel file`);
        }
      }
    } else {
      console.error('[Attendance] Excel file has no data rows');
      throw new Error('Excel file has no data');
    }

    // First, get all valid employee IDs from the database
    const [employees] = await db.query('SELECT employeeId FROM employees');
    const validEmployeeIds = new Set(employees.map(emp => emp.employeeId));

    const validRecords = [];
    const invalidEmployeeIds = new Set();

    data.forEach((row, index) => {
      const employeeId = row['EmployeeID'];

      // Print each date field for debugging:
      console.log(`[Row ${index + 1}] EmployeeID:`, employeeId, '| Date type:', typeof row.Date, '| Date value:', row.Date);

      // Check if employee ID exists in database
      if (!validEmployeeIds.has(employeeId)) {
        invalidEmployeeIds.add(employeeId);
        console.log(`[Attendance] Skipping row ${index + 1}: Employee ID ${employeeId} not found in database`);
        return;
      }

      // Robustly parse date value, only if valid
      const dateStr = formatDateForDB(row.Date);
      if (!dateStr || dateStr === '1970-01-01' || dateStr === '0000-00-00') {
        console.log(`[Attendance] Skipping row ${index + 1}: Invalid date for employee ${employeeId}`, row.Date);
        return;
      }

      validRecords.push({
        employee_id: employeeId,
        date: dateStr,
        punch_in: row['Punch In'] || null,
        punch_out: row['Punch Out'] || null,
      });
    });

    // Report invalid employee IDs if any
    if (invalidEmployeeIds.size > 0) {
      const invalidIds = Array.from(invalidEmployeeIds).join(', ');
      console.log(`[Attendance] Invalid Employee IDs found: ${invalidIds}`);
      return res.status(400).json({
        success: false,
        message: `Invalid Employee IDs found: ${invalidIds}. Please verify these employees exist in the system.`,
        invalidEmployeeIds: Array.from(invalidEmployeeIds)
      });
    }

    console.log('[Attendance] Valid records count:', validRecords.length);
    if (validRecords.length === 0) {
      throw new Error('No valid records found after date validation');
    }
    console.log('[Attendance] Sample valid record:', validRecords[0]);

    await db.query(
      'INSERT INTO attendance (employee_id, date, punch_in, punch_out) VALUES ?',
      [validRecords.map(r => [r.employee_id, r.date, r.punch_in, r.punch_out])]
    );

    console.log('[Attendance] Insert successful. Records processed:', validRecords.length);
    res.json({ success: true, message: 'Attendance data uploaded successfully', recordsProcessed: validRecords.length });
  } catch (err) {
    console.error('[Attendance] Upload failed:', err.message, err.stack);
    res.status(500).json({ success: false, message: 'Upload failed: ' + err.message });
  }
};


exports.getAll = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM attendance');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getByEmployee = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM attendance WHERE employee_id = ?', [req.params.employeeId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.filterByDate = async (req, res) => {
  const { start, end } = req.query;
  try {
    const [rows] = await db.query('SELECT * FROM attendance WHERE date BETWEEN ? AND ?', [start, end]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// attendance.controller.js  (append to existing file)
// ------------------------------------------------------------------
// CREATE / UPSERT  ─ POST /api/attendance
exports.createOrUpdate = async (req, res) => {
  const { employee_id, date, punch_in, punch_out } = req.body;

  if (!employee_id || !date) {
    return res.status(400).json({ message: 'employee_id and date are required' });
  }

  try {
    // Check that the employee exists
    const [empRows] = await db.query(
      'SELECT 1 FROM employees WHERE employeeId = ? LIMIT 1',
      [employee_id]
    );
    if (empRows.length === 0) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // MySQL 8.0+: upsert with ON DUPLICATE KEY UPDATE
    await db.query(
      `INSERT INTO attendance (employee_id, date, punch_in, punch_out)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         punch_in  = VALUES(punch_in),
         punch_out = VALUES(punch_out)`,
      [employee_id, date, punch_in, punch_out]
    );

    // Fetch the freshly-inserted/updated row
    const [rows] = await db.query(
      'SELECT * FROM attendance WHERE employee_id = ? AND date = ?',
      [employee_id, date]
    );

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// READ ONE ─ GET /api/attendance/:employeeId/:date
exports.getOne = async (req, res) => {
  const { employeeId, date } = req.params; // date expected as 2023-11-16
  try {
    const [rows] = await db.query(
      'SELECT * FROM attendance WHERE employee_id = ? AND date = ?',
      [employeeId, date]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// UPDATE ─ PUT /api/attendance/:employeeId/:date
exports.update = async (req, res) => {
  const { employeeId, date } = req.params;
  const { punch_in, punch_out } = req.body;

  try {
    const [result] = await db.query(
      `UPDATE attendance
         SET punch_in = ?, punch_out = ?
       WHERE employee_id = ? AND date = ?`,
      [punch_in, punch_out, employeeId, date]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Record not found' });
    }
    const [rows] = await db.query(
      'SELECT * FROM attendance WHERE employee_id = ? AND date = ?',
      [employeeId, date]
    );
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE ─ DELETE /api/attendance/:employeeId/:date
exports.remove = async (req, res) => {
  const { employeeId, date } = req.params;
  try {
    const [result] = await db.query(
      'DELETE FROM attendance WHERE employee_id = ? AND date = ?',
      [employeeId, date]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Record not found' });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};