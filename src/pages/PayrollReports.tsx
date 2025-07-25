import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '../components/Layout/MainLayout';
import axios from '../api/axios';
import moment from 'moment';

interface PayrollEntry {
  employeeId: string;
  name: string;
  email: string;
  officeName: string;
  positionTitle: string;
  presentDays: number;
  halfDays: number;
  lateDays: number;
  absentDays: number;
  excessLeaves: number;
  baseSalary: number;
  perDaySalary: number;
  totalDeductions: number;
  netSalary: number;
}

interface Summary {
  totalEmployees: number;
  totalNetSalary: string;
  totalDeductions: string;
  netPayroll: string;
  workingDays: number;
}

interface Office {
  id: number;
  name: string;
}

interface Position {
  id: number;
  title: string;
}

const PayrollReports: React.FC = () => {
  const navigate = useNavigate();

  const [selectedMonth, setSelectedMonth] = useState(moment().format('YYYY-MM'));
  const [calendarDays, setCalendarDays] = useState<string[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [officeId, setOfficeId] = useState('');
  const [positionId, setPositionId] = useState('');
  const [offices, setOffices] = useState<Office[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [payrollData, setPayrollData] = useState<PayrollEntry[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [noData, setNoData] = useState(false);

  const pageSizes = [10, 30, 50, 70, 100, 150, 200, 300, 400, 500];
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchDropdowns = async () => {
    try {
      const [officeRes, positionRes] = await Promise.all([
        axios.get('/api/payroll/offices'),
        axios.get('/api/payroll/positions')
      ]);
      setOffices(officeRes.data.data);
      setPositions(positionRes.data.data);
    } catch (err) {
      console.error('Error fetching filters:', err);
    }
  };

  const fetchMonthAttendanceDays = async (yearMonth: string) => {
    setCalendarLoading(true);
    const [y, m] = yearMonth.split('-');
    try {
      const res = await axios.get('/api/payroll/attendance-days', {
        params: { year: y, month: m }
      });
      setCalendarDays(res.data.days || []);
    } catch {
      setCalendarDays([]);
    } finally {
      setCalendarLoading(false);
    }
  };

  useEffect(() => {
    fetchMonthAttendanceDays(selectedMonth);
  }, [selectedMonth]);

  const fetchPayrollReports = async () => {
  setLoading(true);
  setError('');
  setNoData(false);
  try {
    const fromDate = moment(selectedMonth).startOf('month').format('YYYY-MM-DD');
    const toDate = moment(selectedMonth).endOf('month').format('YYYY-MM-DD');
    const params: any = { fromDate, toDate };
    if (officeId) params.office = officeId;
    if (positionId) params.position = positionId;
    const res = await axios.get('/api/payroll/reports', { params });
    setPayrollData(res.data.data);
    setSummary(res.data.summary);
    if (res.data.data.length === 0) {
      setNoData(true);
    }
  } catch (err: any) {
    setError(err.response?.data?.error || 'Failed to fetch reports');
  } finally {
    setLoading(false);
  }
};

// In the return statement
{noData && <p className="text-red-500">No attendance uploaded for {selectedMonth}</p>}

  const buildQS = () => {
    const qs = new URLSearchParams();
    const fromDate = moment(selectedMonth).startOf('month').format('YYYY-MM-DD');
    const toDate = moment(selectedMonth).endOf('month').format('YYYY-MM-DD');
    if (fromDate) qs.set('fromDate', fromDate);
    if (toDate) qs.set('toDate', toDate);
    if (officeId) qs.set('office', officeId);
    if (positionId) qs.set('position', positionId);
    qs.set('page', String(page));
    qs.set('pageSize', String(pageSize));
    return qs.toString();
  };

  const handleEmployeeClick = (employee: PayrollEntry) => {
    const qs = buildQS();
    navigate(`/employee/${employee.employeeId}?${qs}`);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('fromDate')) {
      const selectedMonth = params.get('fromDate')?.substring(0, 7);
      setSelectedMonth(selectedMonth || moment().format('YYYY-MM'));
    }
    if (params.get('office')) setOfficeId(params.get('office')!);
    if (params.get('position')) setPositionId(params.get('position')!);
    if (params.get('pageSize')) setPageSize(Number(params.get('pageSize')));
    if (params.get('page')) setPage(Number(params.get('page')));
    fetchDropdowns();
  }, []);

  useEffect(() => {
    if (payrollData.length === 0 && calendarDays.length === 0) {
      setNoData(true);
    } else {
      setNoData(false);
    }
  }, [payrollData, calendarDays]);

  useEffect(() => {
    const qs = buildQS();
    window.history.replaceState(null, '', qs ? `?${qs}` : undefined);
  }, [selectedMonth, officeId, positionId, page, pageSize]);

  return (
    <MainLayout title="Payroll Reports" subtitle="View and manage employee payroll reports">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={e => {
                setSelectedMonth(e.target.value);
                setPage(1);
                setPayrollData([]);
                setSummary(null);
              }}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Office</label>
              <select
                value={officeId}
                onChange={e => { setPage(1); setOfficeId(e.target.value); }}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Offices</option>
                {offices.map(o => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
              <select
                value={positionId}
                onChange={e => { setPage(1); setPositionId(e.target.value); }}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Positions</option>
                {positions.map(p => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <button
          onClick={fetchPayrollReports}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Fetch Reports
        </button>

        {loading && <p className="text-blue-600">Loading payroll reports...</p>}
        {error && <p className="text-red-500">{error}</p>}
        {noData && <p className="text-red-500">No attendance uploaded for {selectedMonth}</p>}

        {summary && (
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white">
            <h3 className="text-xl font-semibold mb-4">Payroll Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold">{summary.totalEmployees}</div>
                <div className="text-sm opacity-90">Total Employees</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold">{summary.workingDays}</div>
                <div className="text-sm opacity-90">Working Days</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-red-200">AED {summary.totalDeductions}</div>
                <div className="text-sm opacity-90">Total Deductions</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-200">AED {summary.totalNetSalary}</div>
                <div className="text-sm opacity-90">Total Net Salary</div>
              </div>
            </div>
          </div>
        )}

        {!noData && payrollData.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="py-3 px-4 font-semibold text-gray-800 text-left">#</th>
                  <th className="py-3 px-4 font-semibold text-gray-800 text-left">Employee ID</th>
                  <th className="py-3 px-4 font-semibold text-gray-800">Present</th>
                  <th className="py-3 px-4 font-semibold text-gray-800">Late</th>
                  <th className="py-3 px-4 font-semibold text-gray-800">Absent</th>
                  <th className="py-3 px-4 font-semibold text-gray-800">Half</th>
                  <th className="py-3 px-4 font-semibold text-gray-800">Excess Leaves</th>
                  <th className="py-3 px-4 font-semibold text-gray-800">Monthly Salary</th>
                  <th className="py-3 px-4 font-semibold text-gray-800">Deductions</th>
                  <th className="py-3 px-4 font-semibold text-gray-800">Net Salary</th>
                  <th className="py-3 px-4 font-semibold text-gray-800"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payrollData
                  .slice((page - 1) * pageSize, page * pageSize)
                  .map((emp, i) => (
                    <tr
                      key={emp.employeeId}
                      className="hover:bg-blue-50 cursor-pointer transition-all"
                      onClick={() => handleEmployeeClick(emp)}
                    >
                      <td className="py-2 px-4 text-gray-500">{(page - 1) * pageSize + i + 1}</td>
                      <td className="py-2 px-4 text-gray-700 font-mono">{emp.employeeId}</td>
                      <td className="py-2 px-4 text-center">{emp.presentDays}</td>
                      <td className="py-2 px-4 text-center">{emp.lateDays}</td>
                      <td className="py-2 px-4 text-center">{emp.absentDays}</td>
                      <td className="py-2 px-4 text-center">{emp.halfDays}</td>
                      <td className="py-2 px-4 text-center">{emp.excessLeaves}</td>
                      <td className="py-2 px-4 text-green-700 font-medium text-right">
                        AED {emp.baseSalary.toLocaleString()}
                      </td>
                      <td className="py-2 px-4 text-red-600 text-right">
                        AED {emp.totalDeductions.toLocaleString()}
                      </td>
                      <td className="py-2 px-4 font-bold text-green-700 text-right">
                        AED {emp.netSalary.toLocaleString()}
                      </td>
                      <td className="py-2 px-4 text-right">
                        <button
                          className="px-3 py-1 rounded bg-blue-50 text-blue-700 font-medium hover:bg-blue-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEmployeeClick(emp);
                          }}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
            <div className="flex flex-wrap items-center justify-between gap-4 px-2 py-4">
              <div className="text-sm text-gray-500">
                Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, payrollData.length)} of {payrollData.length} employees
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-60"
                  onClick={() => setPage((x) => Math.max(x - 1, 1))}
                  disabled={page === 1}
                >
                  Prev
                </button>
                <span className="mx-2 text-sm">
                  Page {page} of {Math.max(1, Math.ceil(payrollData.length / pageSize))}
                </span>
                <button
                  className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-60"
                  onClick={() => setPage((x) => x + 1)}
                  disabled={page === Math.ceil(payrollData.length / pageSize) || payrollData.length === 0}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default PayrollReports;