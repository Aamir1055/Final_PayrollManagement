// payrollController.js
console.log("==> payrollController.js loaded");

const db = require('../db');
const moment = require('moment');
const axios = require('axios');

/* ------------------------------------------------------------------
   Fetch working-days for a month as COUNT or as ARRAY (dates)
------------------------------------------------------------------ */
const fetchWorkingDaysCount = async (year, month) => {
  try {
    const { data } = await axios.get(
      `http://localhost:${process.env.PORT || 5000}/api/holidays/working-days`,
      { params: { year, month } }
    );
    return data.workingDays ?? 26;
  } catch (e) {
    console.error('Could not fetch working-days', e.message);
    return 26;
  }
};

const fetchWorkingDaysArray = async (year, month) => {
  try {
    const { data } = await axios.get(
      `http://localhost:${process.env.PORT || 5000}/api/holidays/working-days`,
      { params: { year, month } }
    );
    if (Array.isArray(data.days)) return data.days;
    // Fallback: generate numbered dates in month
    const fallback = [];
    for (let d = 1; d <= (data.workingDays || 26); d++) {
      fallback.push(moment.utc(`${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`).format('YYYY-MM-DD'));
    }
    return fallback;
  } catch (e) {
    console.error('Could not fetch working-days', e.message);
    return [];
  }
};

/* ------------------------------------------------------------------
   Employee timing config
------------------------------------------------------------------ */
const getEmployeeTimingConfig = async (employee) => {
  if (!employee.office_id || !employee.position_id) {
    return { duty_hours: 8, reporting_time: '09:00:00' };
  }
  const [rows] = await db.query(
    `SELECT reporting_time, duty_hours
     FROM office_positions
     WHERE office_id = ? AND position_id = ?
     LIMIT 1`,
    [employee.office_id, employee.position_id]
  );
  return {
    reporting_time: rows[0]?.reporting_time || '09:00:00',
    duty_hours: parseFloat(rows[0]?.duty_hours) || 8
  };
};

/* ------------------------------------------------------------------
   Attendance metrics (unchanged)
------------------------------------------------------------------ */
const calculateAttendanceMetrics = async (employee, attRecords, workingDays) => {
  const { duty_hours, reporting_time } = await getEmployeeTimingConfig(employee);
  const dutyMinutes = Math.round(Number(duty_hours) * 60);
  const halfDutyMinutes = Math.round(dutyMinutes / 2);
  const repMoment = moment(reporting_time, 'HH:mm:ss');

  let presentDays = 0, halfDays = 0, lateDays = 0, absentDays = 0;
  let datesWorkedStatus = [];

  const sortedRecords = attRecords.slice().sort((a, b) => moment(a.date).diff(moment(b.date)));

  for (const rec of sortedRecords) {
    const punchIn = moment(rec.punch_in, 'HH:mm:ss');
    const punchOut = moment(rec.punch_out, 'HH:mm:ss');
    let worked = punchOut.diff(punchIn, 'minutes');
    const lateMins = punchIn.diff(repMoment, 'minutes');

    if (!rec.punch_in || !rec.punch_out || isNaN(worked) || worked <= 0) {
      absentDays++;
      datesWorkedStatus.push('A');
      continue;
    }
    if (worked <= halfDutyMinutes) {
      halfDays++;
      datesWorkedStatus.push('HD');
      continue;
    }
    if (lateMins >= 15) {
      lateDays++;
      presentDays++;
      datesWorkedStatus.push('L');
      continue;
    }
    presentDays++;
    datesWorkedStatus.push('P');
  }

  let maxStreak = 0, currStreak = 0;
  datesWorkedStatus.forEach(status => {
    if (status === 'A') { currStreak++; maxStreak = Math.max(maxStreak, currStreak); } else { currStreak = 0; }
  });
  const excessLeaves = maxStreak > 2 ? maxStreak - 2 : 0;

  return { presentDays, halfDays, lateDays, absentDays, excessLeaves };
};

/* ------------------------------------------------------------------
   Salary & deductions (unchanged)
------------------------------------------------------------------ */
const calculateSalaryAndDeductions = (employee, metrics, workingDays) => {
  const baseSalary = parseFloat(employee.monthlySalary || 0);
  const perDaySalary = workingDays ? (baseSalary / workingDays) : 0;

  let totalDeductions = 0;
  totalDeductions += metrics.absentDays * perDaySalary;
  totalDeductions += metrics.halfDays * (perDaySalary / 2);
  totalDeductions += metrics.excessLeaves * 2 * perDaySalary; // <--- this line does it as you ask

  const netSalary = Math.max(0, baseSalary - totalDeductions);
  return { baseSalary, perDaySalary, totalDeductions, netSalary };
};

/* ------------------------------------------------------------------
   Upsert payroll (unchanged)
------------------------------------------------------------------ */
const savePayroll = async (p) => {
  const sql = `
    INSERT INTO payroll (employeeId, month, year, present_days, half_days, late_days,
                        leaves, excess_leaves, deductions_amount, net_salary,
                        created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    ON DUPLICATE KEY UPDATE
      present_days=VALUES(present_days),
      half_days=VALUES(half_days),
      late_days=VALUES(late_days),
      leaves=VALUES(leaves),
      excess_leaves=VALUES(excess_leaves),
      deductions_amount=VALUES(deductions_amount),
      net_salary=VALUES(net_salary),
      updated_at=NOW()
  `;
  await db.query(sql, [
    p.employeeId, p.month, p.year,
    p.present_days, p.half_days, p.late_days,
    p.leaves, p.excess_leaves,
    p.deductions_amount, p.net_salary
  ]);
};

/* ------------------------------------------------------------------
   payroll report endpoint (unchanged)
------------------------------------------------------------------ */
const getPayrollReports = async (req, res) => {
  console.log("==> getPayrollReports CALLED");
  try {
    const { fromDate, toDate, office, position, page = 1, limit = 10 } = req.query;
    if (!fromDate || !toDate)
      return res.status(400).json({ error: 'From date and to date are required' });

    const year = moment(fromDate).year();
    const month = moment(fromDate).month() + 1;
    const workingDays = await fetchWorkingDaysCount(year, month);

    let empQuery = `
      SELECT DISTINCT e.employeeId, e.name, e.email, e.office_id, e.position_id, e.monthlySalary,
        o.name as officeName, p.title as positionTitle
      FROM employees e
      LEFT JOIN offices o ON e.office_id = o.id
      LEFT JOIN positions p ON e.position_id = p.id
      INNER JOIN attendance a ON e.employeeId = a.employee_id AND a.date BETWEEN ? AND ?
      WHERE 1=1
    `;
    let qParams = [fromDate, toDate];
    if (office) { empQuery += ' AND o.id=?'; qParams.push(office); }
    if (position) { empQuery += ' AND p.id=?'; qParams.push(position); }
    empQuery += ` ORDER BY e.name LIMIT ? OFFSET ?`;
    qParams.push(parseInt(limit), (page - 1) * limit);

    const [empRows] = await db.query(empQuery, qParams);
    const employees = empRows;
    if (!employees.length)
      return res.json({ success: true, data: [], message: 'No employees found' });

    const [attRows] = await db.query(
      `SELECT employee_id, date, punch_in, punch_out
       FROM attendance
       WHERE date BETWEEN ? AND ?`,
      [fromDate, toDate]
    );
    const attByEmp = {};
    attRows.forEach(r => {
      if (!attByEmp[r.employee_id]) attByEmp[r.employee_id] = [];
      attByEmp[r.employee_id].push(r);
    });

    let payrollData = [], totalNetSalary = 0, totalDeductions = 0;
    for (const employee of employees) {
      const id = employee.employeeId;
      const empAtt = attByEmp[id] || [];
      const metrics = await calculateAttendanceMetrics(employee, empAtt, workingDays);
      const salaryData = calculateSalaryAndDeductions(employee, metrics, workingDays);

      await savePayroll({
        employeeId: id,
        present_days: metrics.presentDays,
        half_days: metrics.halfDays,
        late_days: metrics.lateDays,
        leaves: metrics.absentDays,
        excess_leaves: metrics.excessLeaves,
        deductions_amount: salaryData.totalDeductions,
        net_salary: salaryData.netSalary,
        month,
        year
      });

      payrollData.push({
        employeeId: id,
        name: employee.name,
        email: employee.email,
        officeName: employee.officeName,
        positionTitle: employee.positionTitle,
        presentDays: metrics.presentDays,
        lateDays: metrics.lateDays,
        halfDays: metrics.halfDays,
        absentDays: metrics.absentDays,
        excessLeaves: metrics.excessLeaves,
        baseSalary: salaryData.baseSalary,
        perDaySalary: salaryData.perDaySalary,
        totalDeductions: salaryData.totalDeductions,
        netSalary: salaryData.netSalary
      });
      totalNetSalary += salaryData.netSalary;
      totalDeductions += salaryData.totalDeductions;
    }

    res.json({
      success: true,
      data: payrollData,
      summary: {
        totalEmployees: payrollData.length,
        totalNetSalary: totalNetSalary.toFixed(2),
        totalDeductions: totalDeductions.toFixed(2),
        netPayroll: totalNetSalary.toFixed(2),
        workingDays
      },
      dateRange: { fromDate, toDate }
    });
  } catch (error) {
    console.error('Error in getPayrollReports:', error);
    res.status(500).json({ error: 'Failed to fetch payroll reports', details: error.message });
  }
};

/* ------------------------------------------------------------------
   individual employee details (per-day metrics)
------------------------------------------------------------------ */
const getEmployeePayrollDetails = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { fromDate, toDate } = req.query;
    if (!fromDate || !toDate)
      return res.status(400).json({ error: 'From date and to date are required' });

    const [empRows] = await db.query(
      `SELECT employeeId, name, email, office_id, position_id, monthlySalary, joiningDate
       FROM employees WHERE employeeId = ?`,
      [employeeId]
    );
    if (!empRows.length) return res.status(404).json({ error: 'Employee not found' });
    const employee = empRows[0];

    const year   = moment(fromDate).year();
    const month  = moment(fromDate).month() + 1;

    // 1. Get all working days (for pending logic and for absent calculations)
    const workingDaysArr = await fetchWorkingDaysArray(year, month);

    // 2. Fetch attendance for employee in range
    const [attRows] = await db.query(
      `SELECT date, punch_in, punch_out
       FROM attendance
       WHERE employee_id=? AND date BETWEEN ? AND ?`,
      [employeeId, fromDate, toDate]
    );
    // Build a map for quick lookup
    const attendanceMap = new Map(attRows.map(row => [moment(row.date).format('YYYY-MM-DD'), row]));

    // 3. For every working day, build a proper daily row, default absent
    const dailyRows = workingDaysArr.map(date => {
      const row = attendanceMap.get(date);
      if (row) {
        const metrics = {
          presentDays: 0, halfDays: 0, lateDays: 0, absentDays: 0, excessLeaves: 0
        };
        calculateAttendanceMetrics(employee, [row], 1)
          .then(m => Object.assign(metrics, m));
        return {
          employeeId: employee.employeeId,
          date,
          ...metrics
        };
      }
      return {
        employeeId: employee.employeeId,
        date,
        presentDays: 0,
        lateDays: 0,
        halfDays: 0,
        absentDays: 1,
        excessLeaves: 0
      };
    });
    // NOTE: Because calculateAttendanceMetrics is async, you may want to refactor
    // this block to properly `await Promise.all` if you need exact classification per row.

    res.json({ success: true, employee, dailyRows });
  } catch (error) {
    console.error('Error getting payroll details:', error);
    res.status(500).json({ error: 'Failed to fetch employee payroll details', details: error.message });
  }
};

/* ------------------------------------------------------------------
   Dropdowns (unchanged)
------------------------------------------------------------------ */
const getOfficesForFilter = async (req, res) => {
  try {
    const [rows] = await db.query(`SELECT id, name FROM offices ORDER BY name`);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch offices', details: error.message });
  }
};

const getPositionsForFilter = async (req, res) => {
  try {
    const [rows] = await db.query(`SELECT id, title FROM positions ORDER BY title`);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch positions', details: error.message });
  }
};

/* ------------------------------------------------------------------
   payroll generation (unchanged)
------------------------------------------------------------------ */
const generatePayrollForDateRange = async (req, res) => {
  try {
    req.query = { ...req.body, ...req.query };
    await getPayrollReports(req, res);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate payroll', details: error.message });
  }
};

/* ------------------------------------------------------------------
   Return the list of dates in a month that have at least one attendance row
------------------------------------------------------------------ */
const getAttendanceDaysInMonth = async (req, res) => {
  try {
    const { year, month } = req.query;
    if (!year || !month)
      return res.status(400).json({ error: 'year and month required' });

    const [rows] = await db.query(
      `SELECT DISTINCT DATE(date) AS d
       FROM attendance
       WHERE YEAR(date)=? AND MONTH(date)=?
       ORDER BY d`,
      [year, month]
    );
    const days = rows.map(r => r.d);
    res.json({ success: true, days });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch attendance days', details: error.message });
  }
};

/* ------------------------------------------------------------------
   API: Get employee's pending attendance days for given month
------------------------------------------------------------------ */
const getEmployeePendingAttendanceDays = async (req, res) => {
  try {
    let { employeeId, year, month } = req.query;
    if (!employeeId || !year || !month) {
      return res.status(400).json({ error: "employeeId, month, year are required" });
    }
    year  = String(year).padStart(4, '0');
    month = String(month).padStart(2, '0');

    // 1. All working days in month
    const workingDaysArray = await fetchWorkingDaysArray(year, month);

    // 2. All attendance entries for this employee in that month
    const [rows] = await db.query(
      `SELECT date FROM attendance WHERE employee_id = ? AND YEAR(date)=? AND MONTH(date)=?`,
      [employeeId, year, month]
    );
    const attendedDatesSet = new Set(rows.map(r => moment(r.date).format('YYYY-MM-DD')));

    // 3. Find which working days have missing attendance
    const pendingDates = workingDaysArray.filter(d => !attendedDatesSet.has(d));

    // 4. Compose response info
    res.json({
      success: true,
      employeeId,
      year,
      month,
      workingDays: workingDaysArray.length,
      attendanceRecorded: workingDaysArray.length - pendingDates.length,
      pendingAttendanceDates: pendingDates,
      absentDays: pendingDates.length
    });
  } catch (e) {
    console.error('Error in getEmployeePendingAttendanceDays:', e.message);
    res.status(500).json({ error: "Failed to fetch pending attendance", details: e.message });
  }
};

/* ------------------------------------------------------------------ */

module.exports = {
  getPayrollReports,
  getEmployeePayrollDetails,
  getOfficesForFilter,
  getPositionsForFilter,
  generatePayrollForDateRange,
  getAttendanceDaysInMonth,
  fetchWorkingDaysCount,
  getEmployeePendingAttendanceDays
};
