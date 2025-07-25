import { useState, useEffect } from 'react';
import { Employee } from '../types';

// Helper to safely extract a string from possible object/string
const getDisplayName = (item: any, nameKey: string = 'name', fallbackKey?: string): string => {
  if (typeof item === 'object' && item?.[nameKey]) return item[nameKey];
  if (typeof item === 'object' && fallbackKey && item?.[fallbackKey]) return item[fallbackKey];
  return String(item);
};

export const useEmployees = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  };

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/employees', {
        headers: getAuthHeaders()
      });
      if (!response.ok) {
        if (response.status === 401) {
          setError('Authentication failed. Please log in again.');
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();

      // Deep normalization: convert any object office_name or position_name to string
      const processedData = data.map((emp: any) => ({
        ...emp,
        office_name: getDisplayName(emp.office_name, 'name', 'office_name') || 'Not assigned',
        position_name: getDisplayName(emp.position_name, 'title', 'position_name') || emp.position_title || 'Not assigned',
        // Fix: Ensure status is boolean
        status: emp.status === 1 || emp.status === true || emp.status === 'active'
      }));

      setEmployees(processedData);
    } catch (err) {
      console.error('Failed to fetch employees:', err);
      setError('Failed to load employees. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
    // eslint-disable-next-line
  }, []);

  const addEmployee = async (employee: Omit<Employee, 'id'>) => {
    try {
      // Validate required fields
      if (!employee.office_name || !employee.position_name) {
        throw new Error('Office and Position are required');
      }
      
      // Fix: Ensure status is handled properly
      const employeeData = {
        ...employee,
        status: employee.status === true || employee.status === 'true' || employee.status === 1
      };

      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(employeeData)
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      await fetchEmployees();
      return data;
    } catch (err) {
      console.error('Failed to add employee:', err);
      throw err;
    }
  };

  const updateEmployee = async (employeeId: string, updates: Partial<Employee>) => {
    try {
      // Validate required fields
      if (!updates.office_name || !updates.position_name) {
        throw new Error('Office and Position are required');
      }
      
      // Fix: Ensure status is handled properly
      const updateData = {
        ...updates,
        status: updates.status === true || updates.status === 'true' || updates.status === 1
      };

      const response = await fetch(`/api/employees/${employeeId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updateData)
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      await fetchEmployees();
      return data;
    } catch (err) {
      console.error('Failed to update employee:', err);
      throw err;
    }
  };

  const deleteEmployee = async (employeeId: string) => {
    try {
      const response = await fetch(`/api/employees/${employeeId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      await fetchEmployees();
    } catch (err) {
      console.error('Failed to delete employee:', err);
      throw err;
    }
  };


const fetchEmployeeById = async (employeeId: string): Promise<Employee | null> => {
  try {
    const response = await fetch(`/api/employees/${employeeId}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) return null;
    const data = await response.json();
    // Normalize like your main fetch:
    return {
      ...data,
      office_name: data.office_name ?? '',
      position_name: data.position_name ?? data.position_title ?? '',
      status: data.status === 1 || data.status === true || data.status === 'active'
    } as Employee;
  } catch (err) {
    return null;
  }
};


  return {
    employees,
    loading,
    error,
    fetchEmployeeById,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    refreshEmployees: fetchEmployees,
  };
};