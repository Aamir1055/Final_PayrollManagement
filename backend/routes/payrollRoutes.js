const express = require('express');
const router = express.Router();
const payrollController = require('../controllers/payrollController');

// Get payroll reports with filters
router.get('/reports', payrollController.getPayrollReports);

// Get detailed employee payroll data
router.get('/employee/:employeeId', payrollController.getEmployeePayrollDetails);

// Get offices for filter dropdown
router.get('/offices', payrollController.getOfficesForFilter);

// Get positions for filter dropdown
router.get('/positions', payrollController.getPositionsForFilter);

// Generate payroll for date range
router.post('/generate', payrollController.generatePayrollForDateRange);

router.get('/attendance-days', payrollController.getAttendanceDaysInMonth);

router.get('/api/attendance/pending-days', payrollController.getEmployeePendingAttendanceDays);

module.exports = router;
