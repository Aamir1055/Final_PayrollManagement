export interface Employee {
  id: number; // Remove undefined if it's always required
  employeeId: string;
  name: string;
  email: string;
  office_id: number;
  office_name: string;
  position_id: number;
  position_name: string;
  monthlySalary: number;
  joiningDate: string;
  status: boolean;
  reporting_time?: string;
  duty_hours?: number;
  position_title?: string; // Optional, if not always present
  dob?: string;
  passport_number?: string;
  passport_expiry?: string;
  visa_type?: string;
  address?: string;
  phone?: string;
  gender?: string;
  
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  punchIn: string;
  punchOut: string;
  hoursWorked: number;
  isLate: boolean;
  isHalfDay: boolean;
  isAbsent: boolean;
}

export interface PayrollRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  office: string;
  month: string;
  year: number;
  presentDays: number;
  halfDays: number;
  lateDays: number;
  leaves: number;
  excessLeaves: number;
  deductionDays: number;
  grossSalary: number;
  deductions: number;
  netSalary: number;
}

export interface Office {
  id: string;
  name: string;
  location: string;
}

export interface PayrollSummary {
  totalEmployees: number;
  totalPayroll: number;
  averageSalary: number;
  totalDeductions: number;
  presentEmployees: number;
  absentEmployees: number;
}