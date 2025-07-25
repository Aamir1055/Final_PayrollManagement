import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '../components/Layout/MainLayout';
import axios from '../api/axios';
import moment from 'moment';

interface DailyRow {
  employeeId: string;
  date: string;
  presentDays: number;
  lateDays: number;
  halfDays: number;
  absentDays: number;
  excessLeaves: number;
}
interface Employee {
  employeeId: string;
  name: string;
  email: string;
  monthlySalary: number;
}
interface AttendanceRow {
  employee_id: string;
  date: string;
  punch_in: string;
  punch_out: string;
}

const EmployeePayrollDetails: React.FC = () => {
  const { employeeId } = useParams<{ employeeId: string }>();
  const navigate = useNavigate();

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [dailyRows, setDailyRows] = useState<DailyRow[]>([]);
  const [workingDays, setWorkingDays] = useState<number>(1); // <-- The key piece
  const [loading, setLoading] = useState(true);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [error, setError] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('edit');
  const [modalAttendance, setModalAttendance] = useState<AttendanceRow | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');
  const [modalNotification, setModalNotification] = useState('');

  // =============== FETCHES ===============

  // Fetch payroll details for employee & period
  const fetchDetails = async (f?: string, t?: string) => {
    if (!employeeId) return;
    setLoading(true);
    setError('');
    try {
      const params: any = {};
      if (f || fromDate) params.fromDate = f || fromDate;
      if (t || toDate)   params.toDate   = t || toDate;
      const { data } = await axios.get(`/api/payroll/employee/${employeeId}`, { params });
      setEmployee(data.employee);
      setDailyRows(data.dailyRows || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch details');
    } finally {
      setLoading(false);
    }
  };

  // Fetch working days using /api/holidays/working-days
  const fetchWorkingDays = async (from: string) => {
    setCalendarLoading(true);
    try {
      const y = moment(from).format('YYYY');
      const m = moment(from).format('MM');
      const res = await axios.get(`/api/holidays/working-days?month=${m}&year=${y}`);
      // API should respond: { days: [ '2025-07-01', ... ] }
      setWorkingDays((res.data.days || []).length || 1);
    } catch (err) {
      setWorkingDays(1); // fallback, avoid division by zero
    } finally {
      setCalendarLoading(false);
    }
  };

  // Handle fetches when date range/filter changes
  useEffect(() => {
    if (fromDate && toDate) {
      fetchDetails(fromDate, toDate);
      fetchWorkingDays(fromDate); // get for the current month (using fromDate)
    }
    // eslint-disable-next-line
  }, [fromDate, toDate]);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const f = p.get('fromDate') || '';
    const t = p.get('toDate') || '';
    setFromDate(f);
    setToDate(t);
    fetchDetails(f, t);
    fetchWorkingDays(f);
    // eslint-disable-next-line
  }, [employeeId]);

  // =============== MODAL LOGIC ===============

  const openAddModal = () => {
    setModalMode('add');
    setModalAttendance({
      employee_id: employeeId!,
      date: '',
      punch_in: '',
      punch_out: '',
    });
    setModalOpen(true);
    setModalNotification('');
    setModalLoading(false);
    setModalError('');
  };

  const openEditModal = async (empId: string, date: string) => {
    setModalMode('edit');
    setModalLoading(true);
    setModalError('');
    setModalOpen(true);
    setModalNotification('');
    try {
      const formattedDate = moment(date).format('YYYY-MM-DD');
      const { data } = await axios.get(`/api/attendance/${empId}/${formattedDate}`);
      setModalAttendance(data);
    } catch (err: any) {
      setModalError(err.response?.data?.message || 'Failed to load attendance');
      setModalAttendance({
        employee_id: empId,
        date: moment(date).format('YYYY-MM-DD'),
        punch_in: '',
        punch_out: ''
      });
    } finally {
      setModalLoading(false);
    }
  };

  const handleModalChange = (field: 'date' | 'punch_in' | 'punch_out', value: string) => {
    setModalAttendance(prev => prev ? { ...prev, [field]: value } : prev);
  };

  const handleModalAdd = async () => {
    if (!modalAttendance) return;
    setModalError('');
    setModalLoading(true);
    setModalNotification('');
    try {
      const { employee_id, date, punch_in, punch_out } = modalAttendance;
      if (!date || !punch_in || !punch_out) {
        setModalError('All fields are required');
        setModalLoading(false);
        return;
      }
      await axios.post(`/api/attendance`, {
        employee_id,
        date: moment(date).format('YYYY-MM-DD'),
        punch_in,
        punch_out,
      });
      setModalNotification('Attendance added successfully!');
      setTimeout(() => { setModalOpen(false); setModalNotification(''); fetchDetails(); }, 1300);
    } catch (err: any) {
      setModalNotification(err.response?.data?.message || 'Add failed');
      setModalError(err.response?.data?.message || 'Add failed');
    } finally {
      setModalLoading(false);
    }
  };

  const handleModalUpdate = async () => {
    if (!modalAttendance) return;
    setModalError('');
    setModalLoading(true);
    setModalNotification('');
    try {
      await axios.put(`/api/attendance/${modalAttendance.employee_id}/${moment(modalAttendance.date).format('YYYY-MM-DD')}`, {
        punch_in: modalAttendance.punch_in,
        punch_out: modalAttendance.punch_out,
      });
      setModalNotification('Updated successfully');
      setTimeout(() => { setModalOpen(false); setModalNotification(''); fetchDetails(); }, 1300);
    } catch (err: any) {
      setModalNotification('Update failed');
    } finally {
      setModalLoading(false);
    }
  };

  const handleModalDelete = async () => {
    if (!modalAttendance) return;
    if (!window.confirm('Are you sure? This will permanently delete the attendance for this date.')) return;
    setModalNotification('');
    try {
      const formattedDate = moment(modalAttendance.date).format('YYYY-MM-DD');
      await axios.delete(`/api/attendance/${modalAttendance.employee_id}/${formattedDate}`);
      setModalNotification('Deleted successfully');
      setTimeout(() => {
        setModalOpen(false); setModalNotification('');
        fetchDetails();
      }, 1300);
    } catch (err: any) {
      setModalNotification('Delete failed');
    }
  };

  if (loading || calendarLoading) return <MainLayout title="Loading…"><div className="text-center">Loading…</div></MainLayout>;
  if (error)    return <MainLayout title="Error"><div className="text-red-600">{error}</div></MainLayout>;
  if (!employee) return <MainLayout title="Not Found">Employee not found</MainLayout>;

  // =============== DEDUCTION CALCULATION (USING PROPER WORKING DAYS) ===============

  const perDaySalary = employee.monthlySalary / workingDays;
  const totalDeductions = dailyRows.reduce(
    (t, r) => t + (r.absentDays + r.halfDays * 0.5) * perDaySalary,
    0
  );
  const totalNetSalary = employee.monthlySalary - totalDeductions;

  return (
    <MainLayout title={`${employee.name}`} subtitle={`ID: ${employee.employeeId}`}>
      <div className="space-y-6">
        <button onClick={() => navigate(-1)} className="text-blue-600 hover:underline">
          ← Back to Payroll Reports
        </button>

        {/* Add Attendance button */}
        <div className="mb-2">
          <button
            onClick={openAddModal}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
          >
            + Add Attendance
          </button>
        </div>
        {/* date filter */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>

        {/* Face Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow-md p-4 flex items-center space-x-4 border">
            <span className="text-green-600 text-xl">₹</span>
            <div>
              <p className="text-xs text-gray-500 uppercase">Monthly Salary</p>
              <p className="text-2xl font-bold text-green-700">
                AED {Number(employee.monthlySalary).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-md p-4 flex items-center space-x-4 border">
            <span className="text-red-600 text-xl">-</span>
            <div>
              <p className="text-xs text-gray-500 uppercase">Total Deductions</p>
              <p className="text-2xl font-bold text-red-700">
                AED {totalDeductions.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
              <span className="text-xs text-gray-500">
                Using working days: {workingDays}
              </span>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-md p-4 flex items-center space-x-4 border">
            <span className="text-blue-600 text-xl">⚡</span>
            <div>
              <p className="text-xs text-gray-500 uppercase">Total Net Salary</p>
              <p className="text-2xl font-bold text-blue-700">
                AED {totalNetSalary.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>

        {/* MODAL */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white rounded-lg shadow-lg p-6 w-[340px] max-w-full">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg font-bold">
                  {modalMode === 'add' ? 'Add Attendance' : 'Edit Attendance'}
                </h2>
                <button onClick={() => { setModalOpen(false); setModalNotification(''); }} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">&times;</button>
              </div>
              {modalNotification && (
                <div
                  className={`mb-3 px-3 py-2 text-sm rounded 
                      ${modalNotification.toLowerCase().includes('success') 
                        ? 'bg-green-100 text-green-800 border border-green-300'
                        : 'bg-red-100 text-red-800 border border-red-300'
                      }`}
                >
                  {modalNotification}
                </div>
              )}
              {modalLoading ? (
                <div className="py-8 text-center">Loading...</div>
              ) : modalError ? (
                <div className="text-red-600">{modalError}</div>
              ) : modalAttendance ? (
                <form
                  className="space-y-3"
                  onSubmit={e => {
                    e.preventDefault();
                    modalMode === 'add' ? handleModalAdd() : handleModalUpdate();
                  }}
                >
                  <div>
                    <label className="font-medium text-sm">Date</label>
                    <input
                      type="date"
                      className="block w-full p-2 border rounded"
                      value={modalAttendance?.date ? moment(modalAttendance.date).format('YYYY-MM-DD') : ''}
                      onChange={e => handleModalChange('date', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="font-medium text-sm">Punch In</label>
                    <input
                      type="time"
                      className="block w-full p-2 border rounded"
                      value={modalAttendance.punch_in || ''}
                      onChange={e => handleModalChange('punch_in', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="font-medium text-sm">Punch Out</label>
                    <input
                      type="time"
                      className="block w-full p-2 border rounded"
                      value={modalAttendance.punch_out || ''}
                      onChange={e => handleModalChange('punch_out', e.target.value)}
                      required
                    />
                  </div>
                  <div className="flex justify-between gap-3 mt-4">
                    <button
                      type="button"
                      onClick={handleModalDelete}
                      className={`bg-red-100 hover:bg-red-200 text-red-800 font-bold px-3 py-1 rounded ${modalMode === 'add' ? 'opacity-40 cursor-not-allowed' : ''}`}
                      disabled={modalLoading || modalMode === 'add'}
                    >Delete</button>
                    <button
                      type="submit"
                      className={`bg-${modalMode === 'add' ? 'green' : 'blue'}-600 hover:bg-${modalMode === 'add' ? 'green' : 'blue'}-700 text-white px-4 py-1 rounded`}
                      disabled={modalLoading}
                    >
                      {modalMode === 'add' ? 'Add' : 'Update'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="text-sm text-gray-500">No attendance data for this date.</div>
              )}
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
          <h3 className="text-lg font-semibold px-6 py-4 border-b">Daily Attendance</h3>
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="py-2 px-4 text-left">Employee ID</th>
                <th className="py-2 px-4 text-left">Date</th>
                <th className="py-2 px-4 text-center">Present</th>
                <th className="py-2 px-4 text-center">Late</th>
                <th className="py-2 px-4 text-center">Half</th>
                <th className="py-2 px-4 text-center">Absent</th>
                <th className="py-2 px-4 text-center">Excess Leave</th>
                <th className="py-2 px-4 text-center">Edit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {dailyRows.map((row) => {
                const displayDate = moment(row.date).format('YYYY-MM-DD');
                return (
                  <tr key={row.date} className="hover:bg-gray-50">
                    <td className="py-2 px-4 font-mono">{row.employeeId}</td>
                    <td className="py-2 px-4">{displayDate}</td>
                    <td className="py-2 px-4 text-center">{row.presentDays}</td>
                    <td className="py-2 px-4 text-center">{row.lateDays}</td>
                    <td className="py-2 px-4 text-center">{row.halfDays}</td>
                    <td className="py-2 px-4 text-center">{row.absentDays}</td>
                    <td className="py-2 px-4 text-center">{row.excessLeaves}</td>
                    <td className="py-2 px-4 text-center">
                      <button
                        onClick={() => openEditModal(row.employeeId, row.date)}
                        className="text-blue-600 hover:text-blue-800"
                        title="Edit Attendance"
                      >✏️</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </MainLayout>
  );
};

export default EmployeePayrollDetails;
