import { Employee } from '../types';
import React, { useState } from 'react';
import { MainLayout } from '../components/Layout/MainLayout';
import { EmployeeTable } from '../components/Employees/EmployeeTable';
import { useEmployees } from '../hooks/useEmployees';
import { Plus, Download, Users, Upload, XCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { useNavigate } from 'react-router-dom';

const getDisplayName = (item: any, nameKey: string = 'name', fallbackKey?: string): string => {
  if (typeof item === 'object' && item?.[nameKey]) return item[nameKey];
  if (typeof item === 'object' && fallbackKey && item?.[fallbackKey]) return item[fallbackKey];
  return String(item);
};

export const Employees: React.FC = () => {
  const {
    employees,
    loading,
    error,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    refreshEmployees,
  } = useEmployees();

  const [searchTerm, setSearchTerm] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const navigate = useNavigate();

  const normalizedEmployees = employees.map((emp) => ({
    ...emp,
    office_name: emp.office_name || '',
  }));

  const filteredEmployees = normalizedEmployees.filter((employee) => {
    const search = searchTerm.trim().toLowerCase();
    const fieldsToSearch = [
      employee.name || '',
      employee.employeeId || '',
      getDisplayName(employee.office_name, 'name', 'office_name'),
      employee.email || '',
      String(employee.monthlySalary || ''),
      employee.status ? 'Active' : 'Inactive',
    ].map(f => String(f).trim().toLowerCase());
    return fieldsToSearch.some(field => field.includes(search));
  });

  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
  const paginatedEmployees = filteredEmployees.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  const handleExportToExcel = () => {
    if (filteredEmployees.length === 0) {
      alert('No employee data to export.');
      return;
    }
    const exportData = filteredEmployees.map((emp) => ({
      'Employee ID': emp.employeeId,
      'Name': emp.name,
      'Email': emp.email,
      'Office': getDisplayName(emp.office_name, 'name', 'office_name'),
      'Monthly Salary (AED)': Number(emp.monthlySalary).toFixed(2),
      'Status': emp.status ? 'Active' : 'Inactive',
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Employees');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(blob, `employees_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleExportSecondaryData = () => {
    if (filteredEmployees.length === 0) {
      alert('No secondary field data to export.');
      return;
    }
    const exportData = filteredEmployees.map(emp => ({
      'Employee ID': emp.employeeId,
      'Date of Birth': emp.dob || '',
      'Passport Number': emp.passport_number || '',
      'Passport Expiry': emp.passport_expiry || '',
      'Visa Type': emp.visa_type || '',
      'Address': emp.address || '',
      'Phone': emp.phone || '',
      'Gender': emp.gender || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'SecondaryEmployeeData');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(blob, `secondary_employee_data_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleDownloadSampleExcel = () => {
    const sampleData = [{
      'Employee ID': 'EMP001',
      'Name': 'John Smith',
      'Email': 'john@example.com',
      'Office ID': 1,
      'Position ID': 2,
      'Salary': 5000,
      'Joining Date': '01-01-2023',
      'Status': 'active'
    }];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'SampleEmployees');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(blob, 'sample_employee_import.xlsx');
  };

  // ADD
  const handleAddEmployee = () => {
    navigate('/employees/add');
  };

  // EDIT
  const handleEditEmployee = (employee: Employee) => {
    navigate(`/employees/edit/${employee.employeeId}`);
  };

  // VIEW
  const handleViewEmployee = (employee: Employee) => {
    navigate(`/employees/view/${employee.employeeId}`);
  };

  const handleDeleteEmployee = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this employee?')) {
      try {
        await deleteEmployee(id);
      } catch (error) {
        console.error('Error deleting employee:', error);
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/employees/import', {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
        },
      });

      if (response.ok) {
        alert('Employees imported successfully');
        refreshEmployees();
      } else {
        throw new Error('Failed to import employees');
      }
    } catch (err) {
      let message = 'Import error';
      if (err instanceof Error) message += ': ' + err.message;
      else message += ': ' + String(err);
      alert(message);
    }
  };

  // --- NEW: SECONDARY DATA IMPORT ---
  const handleSecondaryFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/employees/import-secondary', {
        method: 'POST',
        body: formData,
        headers: { 'Accept': 'application/json' },
      });

      if (response.ok) {
        alert('Secondary employee data imported successfully');
        refreshEmployees();
      } else {
        const errorMsg = await response.text();
        throw new Error(errorMsg || 'Failed to import secondary data');
      }
    } catch (err) {
      let message = 'Import error';
      if (err instanceof Error) message += ': ' + err.message;
      else message += ': ' + String(err);
      alert(message);
    }
  };
  // -----------------------------------

  if (loading) {
    return (
      <MainLayout title="Manage Employees" subtitle="Loading...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout title="Manage Employees" subtitle="Error">
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <XCircle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
              <button
                onClick={refreshEmployees}
                className="mt-2 text-sm text-red-600 hover:text-red-500"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Employee Management" subtitle="Manage your organization's employees">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center space-x-4">
            <input
              type="text"
              placeholder="Search by name, ID, office, email, salary, or status..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-4 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-96"
            />
          </div>
          {/* ##### ACTION BUTTON GROUP - STYLED ##### */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Import Excel */}
            <label
              htmlFor="importExcel"
              className="flex items-center h-10 px-5 min-w-[140px] text-base font-medium rounded-lg
                         bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer transition-colors duration-150 shadow-sm"
            >
              <Upload className="w-4 h-4 mr-2" />
              Import Excel
            </label>
            <input
              id="importExcel"
              type="file"
              accept=".xlsx, .xls"
              onChange={handleFileUpload}
              className="hidden"
            />

            {/* Import Secondary Data */}
            <label
              htmlFor="importSecondaryExcel"
              className="flex items-center h-10 px-5 min-w-[140px] text-base font-medium rounded-lg
                         bg-purple-600 text-white hover:bg-purple-700 cursor-pointer transition-colors duration-150 shadow-sm"
            >
              <Upload className="w-4 h-4 mr-2" />
              Import Secondary Data
            </label>
            <input
              id="importSecondaryExcel"
              type="file"
              accept=".xlsx, .xls"
              onChange={handleSecondaryFileUpload}
              className="hidden"
            />

            {/* Download Sample */}
            <button
              onClick={handleDownloadSampleExcel}
              className="flex items-center h-10 px-5 min-w-[140px] text-base font-medium rounded-lg
                         text-blue-700 border border-blue-300 bg-blue-50 hover:bg-blue-100 transition-colors duration-150 shadow-sm"
            >
              <Download className="w-4 h-4 mr-2" />
              Sample Excel
            </button>

            {/* Export */}
            <button
              onClick={handleExportToExcel}
              className="flex items-center h-10 px-5 min-w-[140px] text-base font-medium rounded-lg
                         text-gray-700 border border-gray-300 bg-white hover:bg-gray-50 transition-colors duration-150 shadow-sm"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </button>

            {/* Export Secondary Data */}
            <button
              onClick={handleExportSecondaryData}
              className="flex items-center h-10 px-5 min-w-[140px] text-base font-medium rounded-lg
                         bg-purple-600 text-white hover:bg-purple-700 transition-colors duration-150 shadow-sm"
            >
              Export Secondary Data
            </button>

            {/* Add New Employee */}
            <button
              onClick={handleAddEmployee}
              className="flex items-center h-10 px-5 min-w-[140px] text-base font-medium rounded-lg
                         bg-green-600 text-white hover:bg-green-700 transition-colors duration-150 shadow-sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add New Employee
            </button>
          </div>
          {/* ##### END ACTION BUTTON GROUP ##### */}
        </div>

        <div className="flex justify-end">
          <label htmlFor="itemsPerPage" className="mr-2 text-gray-700 font-medium">
            Records per page:
          </label>
          <select
            id="itemsPerPage"
            value={itemsPerPage}
            onChange={handleItemsPerPageChange}
            className="border border-gray-300 rounded px-2 py-1"
          >
            {[10, 20, 50, 100, 200, 500].map((num) => (
              <option key={num} value={num}>
                {num}
              </option>
            ))}
          </select>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Users className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">
                Total Employees: {filteredEmployees.length}
              </span>
            </div>
            <div className="text-sm text-gray-500">
              Showing {paginatedEmployees.length} of {filteredEmployees.length}
            </div>
          </div>
        </div>
        {filteredEmployees.length > 0 ? (
          <>
            <EmployeeTable
              employees={paginatedEmployees}
              onEdit={handleEditEmployee}
              onDelete={handleDeleteEmployee}
              onView={handleViewEmployee}
            />
            <div className="flex justify-between items-center px-4 py-4 border-t border-gray-200 bg-white rounded-b-lg">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No employees found</h3>
            <p className="text-gray-500 mb-6">
              {searchTerm
                ? 'No employees match your search.'
                : 'Get started by adding a new employee.'}
            </p>
            {!searchTerm && (
              <button
                onClick={handleAddEmployee}
                className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                Add Your First Employee
              </button>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
};
