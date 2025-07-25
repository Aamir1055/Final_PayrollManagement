import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Filter, Download, Eye, Search, Users, Clock, DollarSign, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import axios from 'axios';
import moment from 'moment';

const PayrollReports = () => {
  // State for filters
  const [filters, setFilters] = useState({
    startDate: moment().startOf('month').format('YYYY-MM-DD'),
    endDate: moment().endOf('month').format('YYYY-MM-DD'),
    office: '',
    position: '',
    employeeId: '',
    page: 1,
    limit: 10
  });

  // State for data
  const [payrollData, setPayrollData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);
  
  // State for dropdown options
  const [offices, setOffices] = useState([]);
  const [positions, setPositions] = useState([]);
  
  // State for detailed view
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeDetails, setEmployeeDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // State for summary statistics
  const [summary, setSummary] = useState({
    totalEmployees: 0,
    totalGrossSalary: 0,
    totalDeductions: 0,
    totalNetSalary: 0,
    averageAttendance: 0
  });

  // Fetch dropdown options on component mount
  useEffect(() => {
    fetchOffices();
    fetchPositions();
  }, []);

  // Fetch payroll data when filters change
  useEffect(() => {
    fetchPayrollData();
  }, [filters]);

  const fetchOffices = async () => {
    try {
      const response = await axios.get('/api/payroll/offices');
      setOffices(response.data);
    } catch (error) {
      console.error('Error fetching offices:', error);
    }
  };

  const fetchPositions = async () => {
    try {
      const response = await axios.get('/api/payroll/positions');
      setPositions(response.data);
    } catch (error) {
      console.error('Error fetching positions:', error);
    }
  };

  const fetchPayrollData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const response = await axios.get(`/api/payroll/reports?${params}`);
      setPayrollData(response.data.data);
      setTotalPages(response.data.totalPages);
      setTotalRecords(response.data.totalRecords);
      
      // Calculate summary statistics
      calculateSummary(response.data.data);
    } catch (error) {
      console.error('Error fetching payroll data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateSummary = (data) => {
    const totalEmployees = data.length;
    const totalGrossSalary = data.reduce((sum, emp) => sum + emp.grossSalary, 0);
    const totalDeductions = data.reduce((sum, emp) => sum + emp.totalDeductions, 0);
    const totalNetSalary = data.reduce((sum, emp) => sum + emp.netSalary, 0);
    const averageAttendance = data.length > 0 
      ? data.reduce((sum, emp) => sum + emp.presentDays, 0) / totalEmployees 
      : 0;

    setSummary({
      totalEmployees,
      totalGrossSalary,
      totalDeductions,
      totalNetSalary,
      averageAttendance
    });
  };

  const fetchEmployeeDetails = async (employeeId) => {
    setDetailsLoading(true);
    try {
      const response = await axios.get(`/api/payroll/employee/${employeeId}`, {
        params: {
          startDate: filters.startDate,
          endDate: filters.endDate
        }
      });
      setEmployeeDetails(response.data);
    } catch (error) {
      console.error('Error fetching employee details:', error);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1 // Reset to first page when filter changes
    }));
  };

  const handlePageChange = (newPage) => {
    setFilters(prev => ({
      ...prev,
      page: newPage
    }));
  };

  const exportToPDF = async () => {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value && key !== 'page' && key !== 'limit') {
          params.append(key, value);
        }
      });

      const response = await axios.get(`/api/payroll/export/pdf?${params}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `payroll_report_${moment().format('YYYY-MM-DD')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error exporting to PDF:', error);
    }
  };

  const exportToExcel = async () => {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value && key !== 'page' && key !== 'limit') {
          params.append(key, value);
        }
      });

      const response = await axios.get(`/api/payroll/export/excel?${params}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `payroll_report_${moment().format('YYYY-MM-DD')}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error exporting to Excel:', error);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return moment(dateString).format('DD/MM/YYYY');
  };

  const getAttendanceStatusColor = (status) => {
    switch (status) {
      case 'present': return 'bg-green-100 text-green-800';
      case 'late': return 'bg-yellow-100 text-yellow-800';
      case 'half_day': return 'bg-blue-100 text-blue-800';
      case 'absent': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Payroll Reports</h1>
        <div className="flex space-x-2">
          <Button onClick={exportToPDF} variant="outline" className="flex items-center space-x-2">
            <Download className="w-4 h-4" />
            <span>Export PDF</span>
          </Button>
          <Button onClick={exportToExcel} variant="outline" className="flex items-center space-x-2">
            <Download className="w-4 h-4" />
            <span>Export Excel</span>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Employees</p>
                <p className="text-2xl font-bold text-gray-900">{summary.totalEmployees}</p>
              </div>
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Gross Salary</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.totalGrossSalary)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Deductions</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.totalDeductions)}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Net Salary</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.totalNetSalary)}</p>
              </div>
              <Clock className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="w-5 h-5" />
            <span>Filters</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Office</label>
              <Select value={filters.office} onValueChange={(value) => handleFilterChange('office', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select office" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Offices</SelectItem>
                  {offices.map(office => (
                    <SelectItem key={office.id} value={office.id.toString()}>
                      {office.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
              <Select value={filters.position} onValueChange={(value) => handleFilterChange('position', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select position" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Positions</SelectItem>
                  {positions.map(position => (
                    <SelectItem key={position.id} value={position.id.toString()}>
                      {position.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID</label>
              <Input
                placeholder="Search by Employee ID"
                value={filters.employeeId}
                onChange={(e) => handleFilterChange('employeeId', e.target.value)}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Records per page</label>
              <Select value={filters.limit.toString()} onValueChange={(value) => handleFilterChange('limit', parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payroll Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payroll Data</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">Employee ID</th>
                    <th className="text-left p-3 font-medium">Name</th>
                    <th className="text-left p-3 font-medium">Office</th>
                    <th className="text-left p-3 font-medium">Position</th>
                    <th className="text-left p-3 font-medium">Present Days</th>
                    <th className="text-left p-3 font-medium">Late Days</th>
                    <th className="text-left p-3 font-medium">Half Days</th>
                    <th className="text-left p-3 font-medium">Gross Salary</th>
                    <th className="text-left p-3 font-medium">Deductions</th>
                    <th className="text-left p-3 font-medium">Net Salary</th>
                    <th className="text-left p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payrollData.map((employee) => (
                    <tr key={employee.employeeId} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-medium">{employee.employeeId}</td>
                      <td className="p-3">{employee.name}</td>
                      <td className="p-3">{employee.officeName}</td>
                      <td className="p-3">{employee.positionTitle}</td>
                      <td className="p-3">
                        <Badge variant="secondary">{employee.presentDays}</Badge>
                      </td>
                      <td className="p-3">
                        <Badge variant="destructive">{employee.lateDays}</Badge>
                      </td>
                      <td className="p-3">
                        <Badge variant="secondary">{employee.halfDays}</Badge>
                      </td>
                      <td className="p-3 font-medium">{formatCurrency(employee.grossSalary)}</td>
                      <td className="p-3 text-red-600">{formatCurrency(employee.totalDeductions)}</td>
                      <td className="p-3 font-bold text-green-600">{formatCurrency(employee.netSalary)}</td>
                      <td className="p-3">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setSelectedEmployee(employee);
                                fetchEmployeeDetails(employee.employeeId);
                              }}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View Details
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[80vh]">
                            <DialogHeader>
                              <DialogTitle>
                                Employee Details - {selectedEmployee?.name} ({selectedEmployee?.employeeId})
                              </DialogTitle>
                            </DialogHeader>
                            <ScrollArea className="h-[60vh]">
                              {detailsLoading ? (
                                <div className="flex justify-center items-center h-32">
                                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                </div>
                              ) : employeeDetails ? (
                                <Tabs defaultValue="summary" className="w-full">
                                  <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="summary">Summary</TabsTrigger>
                                    <TabsTrigger value="daily">Daily Attendance</TabsTrigger>
                                  </TabsList>
                                  
                                  <TabsContent value="summary" className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                      <Card>
                                        <CardContent className="p-4">
                                          <h3 className="font-semibold mb-2">Basic Information</h3>
                                          <div className="space-y-2 text-sm">
                                            <p><strong>Employee ID:</strong> {employeeDetails.employeeId}</p>
                                            <p><strong>Name:</strong> {employeeDetails.name}</p>
                                            <p><strong>Office:</strong> {employeeDetails.officeName}</p>
                                            <p><strong>Position:</strong> {employeeDetails.positionTitle}</p>
                                            <p><strong>Monthly Salary:</strong> {formatCurrency(employeeDetails.monthlySalary)}</p>
                                          </div>
                                        </CardContent>
                                      </Card>
                                      
                                      <Card>
                                        <CardContent className="p-4">
                                          <h3 className="font-semibold mb-2">Attendance Summary</h3>
                                          <div className="space-y-2 text-sm">
                                            <p><strong>Working Days:</strong> {employeeDetails.workingDays}</p>
                                            <p><strong>Present Days:</strong> {employeeDetails.presentDays}</p>
                                            <p><strong>Late Days:</strong> {employeeDetails.lateDays}</p>
                                            <p><strong>Half Days:</strong> {employeeDetails.halfDays}</p>
                                            <p><strong>Total Late Minutes:</strong> {employeeDetails.totalLateMinutes}</p>
                                          </div>
                                        </CardContent>
                                      </Card>
                                    </div>
                                    
                                    <Card>
                                      <CardContent className="p-4">
                                        <h3 className="font-semibold mb-2">Salary Breakdown</h3>
                                        <div className="space-y-2 text-sm">
                                          <div className="flex justify-between">
                                            <span>Gross Salary:</span>
                                            <span className="font-medium">{formatCurrency(employeeDetails.grossSalary)}</span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span>Absence Deduction:</span>
                                            <span className="text-red-600">-{formatCurrency(employeeDetails.absenceDeduction)}</span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span>Half Day Deduction:</span>
                                            <span className="text-red-600">-{formatCurrency(employeeDetails.halfDayDeduction)}</span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span>Lateness Deduction:</span>
                                            <span className="text-red-600">-{formatCurrency(employeeDetails.latenessDeduction)}</span>
                                          </div>
                                          <div className="flex justify-between border-t pt-2">
                                            <span className="font-semibold">Net Salary:</span>
                                            <span className="font-bold text-green-600">{formatCurrency(employeeDetails.netSalary)}</span>
                                          </div>
                                        </div>
                                      </CardContent>
                                    </Card>
                                  </TabsContent>
                                  
                                  <TabsContent value="daily" className="space-y-4">
                                    <div className="overflow-x-auto">
                                      <table className="w-full border-collapse">
                                        <thead>
                                          <tr className="border-b">
                                            <th className="text-left p-2">Date</th>
                                            <th className="text-left p-2">Punch In</th>
                                            <th className="text-left p-2">Punch Out</th>
                                            <th className="text-left p-2">Status</th>
                                            <th className="text-left p-2">Late Minutes</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {employeeDetails.dailyAttendance?.map((record, index) => (
                                            <tr key={index} className="border-b">
                                              <td className="p-2">{formatDate(record.date)}</td>
                                              <td className="p-2">{record.punchIn || '-'}</td>
                                              <td className="p-2">{record.punchOut || '-'}</td>
                                              <td className="p-2">
                                                <Badge className={getAttendanceStatusColor(record.status)}>
                                                  {record.status}
                                                </Badge>
                                              </td>
                                              <td className="p-2">{record.lateMinutes || 0}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </TabsContent>
                                </Tabs>
                              ) : (
                                <div className="text-center py-8">
                                  <p className="text-gray-500">No details available</p>
                                </div>
                              )}
                            </ScrollArea>
                          </DialogContent>
                        </Dialog>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {payrollData.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500">No payroll data found for the selected criteria.</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center space-x-2">
          <Button
            variant="outline"
            onClick={() => handlePageChange(filters.page - 1)}
            disabled={filters.page === 1}
          >
            Previous
          </Button>
          
          <div className="flex space-x-1">
            {[...Array(totalPages)].map((_, index) => (
              <Button
                key={index + 1}
                variant={filters.page === index + 1 ? "default" : "outline"}
                onClick={() => handlePageChange(index + 1)}
                className="w-10 h-10"
              >
                {index + 1}
              </Button>
            ))}
          </div>
          
          <Button
            variant="outline"
            onClick={() => handlePageChange(filters.page + 1)}
            disabled={filters.page === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
};

export default PayrollReports;
