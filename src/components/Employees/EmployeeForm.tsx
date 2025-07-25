import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import { Employee } from '../../types';

interface Office {
  id: number;
  name: string;
}
interface Position {
  id: number;
  title: string;
}
interface EmployeeFormProps {
  employee?: Employee;
  onSubmit?: (data: any) => void;
  onClose: () => void;
  viewOnly?: boolean;
  fullPage?: boolean;
}

const EmployeeForm: React.FC<EmployeeFormProps> = ({
  employee,
  onSubmit,
  onClose,
  viewOnly = false,
  fullPage = false,
}) => {
  const [offices, setOffices] = useState<Office[]>([]);
  const [allPositions, setAllPositions] = useState<Position[]>([]);
  const [filteredPositions, setFilteredPositions] = useState<Position[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reportingTime, setReportingTime] = useState<string>('Select office and position');
  const [dutyHours, setDutyHours] = useState<string>('Select office and position');

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    reset,
    watch,
  } = useForm<Employee>({
    defaultValues: {
      id: undefined,
      employeeId: '',
      name: '',
      email: '',
      office_id: 0,
      office_name: '',
      position_id: 0,
      position_name: '',
      monthlySalary: 0,
      joiningDate: '',
      status: true,
      dob: '',
      passport_number: '',
      passport_expiry: '',
      visa_type: '',
      address: '',
      phone: '',
      gender: '',
    },
  });

  const statusValue = watch('status');
  const officeId = watch('office_id');
  const positionId = watch('position_id');

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
    };
  };

  const formatDutyHours = (hours: unknown): string => {
    if (hours === undefined || hours === null) return 'Not set';
    if (typeof hours === 'number') return `${hours} hours`;
    if (typeof hours === 'string') return hours.includes('hours') ? hours : `${hours} hours`;
    return 'Not set';
  };

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [officesRes, positionsRes] = await Promise.all([
          fetch('/api/employees/offices/options', { headers: getAuthHeaders() }),
          fetch('/api/employees/positions/options', { headers: getAuthHeaders() }),
        ]);

        let officesData: Office[] = [];
        let positionsData: Position[] = [];

        if (officesRes.ok) {
          officesData = await officesRes.json();
          setOffices(officesData);
        }
        if (positionsRes.ok) {
          positionsData = await positionsRes.json();
          setAllPositions(positionsData);
          setFilteredPositions(positionsData);
        }

        if (employee) {
          const officeObj = officesData.find(o =>
            o.name === employee.office_name ||
            o.id === employee.office_id
          );
          const positionObj = positionsData.find(p =>
            p.title === (employee.position_name || employee.position_title) ||
            p.id === employee.position_id
          );
          let statusBoolean = true;
          if (typeof employee.status === 'boolean') {
            statusBoolean = employee.status;
          } else if (typeof employee.status === 'number') {
            statusBoolean = employee.status === 1;
          } else if (typeof employee.status === 'string') {
            statusBoolean = employee.status.toLowerCase() === 'active' || employee.status === '1';
          }

          reset({
            ...employee,
            office_id: officeObj?.id ?? 0,
            position_id: positionObj?.id ?? 0,
            office_name: employee.office_name || officeObj?.name || '',
            position_name: employee.position_name || employee.position_title || positionObj?.title || '',
            joiningDate: employee.joiningDate ? employee.joiningDate.split('T')[0] : '',
            status: statusBoolean,
            dob: employee.dob ? employee.dob.split('T')[0] : '',
            passport_number: employee.passport_number || '',
            passport_expiry: employee.passport_expiry ? employee.passport_expiry.split('T')[0] : '',
            visa_type: employee.visa_type || '',
            address: employee.address || '',
            phone: employee.phone || '',
            gender: employee.gender || '',
          });

          setReportingTime(employee.reporting_time?.toString() || 'Not set');
          setDutyHours(formatDutyHours(employee.duty_hours));
          if (officeObj?.id) {
            await fetchPositionsForOffice(officeObj.id);
          }
        } else {
          reset();
        }
      } catch (error) {
        console.error('Error fetching options:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchOptions();
    // eslint-disable-next-line
  }, [employee, viewOnly, reset]);

  useEffect(() => {
    if (officeId && officeId !== 0) {
      fetchPositionsForOffice(officeId);
      if (!employee || employee.office_id !== officeId) {
        setValue('position_id', 0);
        setReportingTime('Select position');
        setDutyHours('Select position');
      }
    } else {
      setFilteredPositions(allPositions);
      setReportingTime('Select office and position');
      setDutyHours('Select office and position');
    }
    // eslint-disable-next-line
  }, [officeId, allPositions, employee, setValue]);

  useEffect(() => {
    const fetchOfficePositionData = async () => {
      if (officeId && positionId && officeId !== 0 && positionId !== 0) {
        try {
          const response = await fetch(`/api/employees/office-position/${officeId}/${positionId}`, {
            headers: getAuthHeaders(),
          });
          if (response.ok) {
            const data = await response.json();
            setReportingTime(data.reporting_time?.toString() || 'Not set');
            setDutyHours(formatDutyHours(data.duty_hours));
          } else {
            setReportingTime('Not set');
            setDutyHours('Not set');
          }
        } catch (error) {
          console.error('Error fetching office position data:', error);
          setReportingTime('Error loading data');
          setDutyHours('Error loading data');
        }
      }
    };
    fetchOfficePositionData();
    // eslint-disable-next-line
  }, [officeId, positionId]);

  const fetchPositionsForOffice = async (selectedOfficeId: number) => {
    try {
      const response = await fetch(`/api/employees/positions/by-office/${selectedOfficeId}`, {
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        const positionsData = await response.json();
        setFilteredPositions(positionsData);
      } else {
        setFilteredPositions([]);
      }
    } catch (error) {
      console.error('Error fetching positions for office:', error);
      setFilteredPositions([]);
    }
  };

  const handleFormSubmit = (formData: Employee) => {
    try {
      const office = offices.find(o => String(o.id) === String(formData.office_id));
      const position = filteredPositions.find(p => String(p.id) === String(formData.position_id));
      const completeEmployeeData: any = {
        employeeId: formData.employeeId,
        name: formData.name,
        email: formData.email,
        office_name: office?.name || '',
        position_name: position?.title || '',
        monthlySalary: formData.monthlySalary,
        joiningDate: formData.joiningDate ? new Date(formData.joiningDate).toISOString().split('T')[0] : '',
        status: formData.status,
        dob: formData.dob || null,
        passport_number: formData.passport_number || null,
        passport_expiry: formData.passport_expiry || null,
        visa_type: formData.visa_type || null,
        address: formData.address || null,
        phone: formData.phone || null,
        gender: formData.gender || null,
      };
      if (onSubmit) {
        onSubmit(completeEmployeeData);
      }
    } catch (error) {
      console.error('Error in handleFormSubmit:', error);
    }
  };

  if (isLoading) {
    return (
      <div className={fullPage ? "flex justify-center items-center h-screen" : "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"}>
        <div className={fullPage ? "bg-white rounded-lg shadow-xl p-6 w-full max-w-6xl mx-auto" : "bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl"}>
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </div>
    );
  }

  const allFields = (
    <>
      {/* Employee ID */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID</label>
        <input
          {...register('employeeId', { required: 'Employee ID is required' })}
          disabled={viewOnly}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white-100"
        />
        {errors.employeeId && <p className="text-red-500 text-sm mt-1">{errors.employeeId.message}</p>}
      </div>
      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
        <input
          {...register('name', { required: 'Name is required' })}
          disabled={viewOnly}
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
        />
        {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
      </div>
      {/* Email */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <input
          type="email"
          {...register('email', {
            required: 'Email is required',
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: 'Invalid email address',
            },
          })}
          disabled={viewOnly}
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
        />
        {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
      </div>
      {/* Monthly Salary */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Salary</label>
        <input
          type="number"
          {...register('monthlySalary', {
            required: 'Salary is required',
            min: { value: 0, message: 'Salary must be positive' },
          })}
          disabled={viewOnly}
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
        />
        {errors.monthlySalary && <p className="text-red-500 text-sm mt-1">{errors.monthlySalary.message}</p>}
      </div>
      {/* Office */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Office</label>
        <select
          {...register('office_id', {
            required: 'Office is required',
            validate: value => value !== 0 || 'Please select an office',
          })}
          disabled={viewOnly}
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
        >
          <option value={0}>Select Office</option>
          {offices.map(office => (
            <option key={office.id} value={office.id}>
              {office.name}
            </option>
          ))}
        </select>
        {errors.office_id && <p className="text-red-500 text-sm mt-1">{errors.office_id.message}</p>}
      </div>
      {/* Position */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
        <select
          {...register('position_id', {
            required: 'Position is required',
            validate: value => value !== 0 || 'Please select a position',
          })}
          disabled={viewOnly || !officeId}
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
        >
          <option value={0}>
            {!officeId ? 'Select office first' : 'Select Position'}
          </option>
          {filteredPositions.map(position => (
            <option key={position.id} value={position.id}>
              {position.title}
            </option>
          ))}
        </select>
        {errors.position_id && <p className="text-red-500 text-sm mt-1">{errors.position_id.message}</p>}
      </div>
      {/* Joining Date */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Joining Date</label>
        <input
          type="date"
          {...register('joiningDate', { required: 'Joining date is required' })}
          disabled={viewOnly}
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
        />
        {errors.joiningDate && <p className="text-red-500 text-sm mt-1">{errors.joiningDate.message}</p>}
      </div>
      {/* Status */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
        <select
          {...register('status', { required: 'Status is required' })}
          disabled={viewOnly}
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
        >
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
        {errors.status && <p className="text-red-500 text-sm mt-1">{errors.status.message}</p>}
      </div>
      {/* Reporting Time */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Reporting Time</label>
        <input
          type="text"
          value={reportingTime}
          disabled
          className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-100"
        />
      </div>
      {/* Duty Hours */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Duty Hours</label>
        <input
          type="text"
          value={dutyHours}
          disabled
          className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-100"
        />
      </div>
      {/* Date of Birth */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
        <input
          type="date"
          {...register('dob')}
          disabled={viewOnly}
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
        />
      </div>
      {/* Passport Number */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Passport Number</label>
        <input
          {...register('passport_number')}
          disabled={viewOnly}
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
          autoComplete="off"
        />
      </div>
      {/* Passport Expiry */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Passport Expiry</label>
        <input
          type="date"
          {...register('passport_expiry')}
          disabled={viewOnly}
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
        />
      </div>
      {/* Visa Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Visa Type</label>
        <input
          {...register('visa_type')}
          disabled={viewOnly}
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
          autoComplete="off"
        />
      </div>
      {/* Address */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
        <input
          {...register('address')}
          disabled={viewOnly}
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
          autoComplete="off"
        />
      </div>
      {/* Phone Number */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
        <input
          {...register('phone')}
          disabled={viewOnly}
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
          autoComplete="off"
        />
      </div>
      {/* Gender */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
        <select
          {...register('gender')}
          disabled={viewOnly}
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
        >
          <option value="">Select Gender</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
          <option value="Other">Other</option>
        </select>
      </div>
    </>
  );

  if (fullPage) {
    return (
      <div className="bg-white rounded-lg shadow-lg w-full max-w-6xl mx-auto p-8 my-8">
        <div className="flex items-center justify-between pb-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {viewOnly ? 'View Employee' : employee ? 'Edit Employee' : 'Add Employee'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form
          onSubmit={handleSubmit(handleFormSubmit)}
          className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          {allFields}
          {!viewOnly && (
            <div className="md:col-span-2 flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg"
              >
                Save
              </button>
            </div>
          )}
        </form>
      </div>
    );
  }

  // MODAL BLOCK
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {viewOnly ? 'View Employee' : employee ? 'Edit Employee' : 'Add Employee'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {allFields}
          {!viewOnly && (
            <div className="md:col-span-2 flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg"
              >
                Save
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default EmployeeForm;
