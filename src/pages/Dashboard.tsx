import React, { useEffect, useState } from 'react';
import { MainLayout } from '../components/Layout/MainLayout';
import { MetricCard } from '../components/Dashboard/MetricCard';

export const Dashboard: React.FC = () => {
  // State variables
  const [totalEmployees, setTotalEmployees] = useState<number | null>(null);
  const [totalMonthlySalary, setTotalMonthlySalary] = useState<number | null>(null);
  const [officeSummary, setOfficeSummary] = useState<any[]>([]);
  const [offices, setOffices] = useState<string[]>([]);
  const [positions, setPositions] = useState<string[]>([]);

  // Modal states
  const [showOfficeModal, setShowOfficeModal] = useState(false);
  const [showPositionModal, setShowPositionModal] = useState(false);

  // Office Master state
  const [newOfficeName, setNewOfficeName] = useState('');
  const [officePositions, setOfficePositions] = useState<{
    positionName: string;
    reportingTime: string;
    dutyHours: number;
  }[]>([]);

  // Position Master state
  const [selectedOfficeForPosition, setSelectedOfficeForPosition] = useState('');
  const [newPositionName, setNewPositionName] = useState('');
  const [positionReportingTime, setPositionReportingTime] = useState('09:00');
  const [positionDutyHours, setPositionDutyHours] = useState(8);

  // Auth headers function
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  };

  // Fetch functions
  const fetchOffices = async () => {
    try {
      const response = await fetch('/api/masters/offices', {
        headers: getAuthHeaders()
      });
      if (!response.ok) {
        throw new Error('Failed to fetch offices');
      }
      const data = await response.json();
      const officeNames = data.map((office: any) => (typeof office === 'string' ? office : office.name));
      setOffices(officeNames);
    } catch (error) {
      console.error('Failed to fetch offices:', error);
    }
  };

  const fetchPositions = async () => {
    try {
      const response = await fetch('/api/masters/positions', {
        headers: getAuthHeaders()
      });
      if (!response.ok) {
        throw new Error('Failed to fetch positions');
      }
      const data = await response.json();
      const positionNames = data.map((pos: any) => (typeof pos === 'string' ? pos : pos.title));
      setPositions(positionNames);
    } catch (error) {
      console.error('Failed to fetch positions:', error);
    }
  };

  const fetchOfficeSummary = async () => {
    try {
      const response = await fetch('/api/employees/summary-by-office', {
        headers: getAuthHeaders()
      });
      if (!response.ok) {
        throw new Error('Failed to fetch office summary');
      }
      const data = await response.json();
      setOfficeSummary(data);
    } catch (error) {
      console.error('Error fetching office summary:', error);
    }
  };

  const fetchTotalEmployees = async () => {
    try {
      const response = await fetch('/api/employees/count', {
        headers: getAuthHeaders()
      });
      if (!response.ok) {
        throw new Error('Failed to fetch total employees');
      }
      const data = await response.json();
      setTotalEmployees(data.total);
    } catch (error) {
      console.error('Error fetching total employees:', error);
    }
  };

  const fetchTotalMonthlySalary = async () => {
    try {
      const response = await fetch('/api/employees/salary/total', {
        headers: getAuthHeaders()
      });
      if (!response.ok) {
        throw new Error('Failed to fetch total salary');
      }
      const data = await response.json();
      setTotalMonthlySalary(data.totalSalary);
    } catch (error) {
      console.error('Error fetching total salary:', error);
    }
  };

  // useEffect to fetch all data on component mount
  useEffect(() => {
    fetchTotalEmployees();
    fetchTotalMonthlySalary();
    fetchOfficeSummary();
    fetchOffices();
    fetchPositions();
  }, []);

  // Office Master Functions
  const handleAddOfficePosition = () => {
    setOfficePositions([...officePositions, {
      positionName: '',
      reportingTime: '09:00',
      dutyHours: 8
    }]);
  };

  const removeOfficePosition = (index: number) => {
    setOfficePositions(officePositions.filter((_, i) => i !== index));
  };

  const updateOfficePosition = (index: number, field: string, value: string | number) => {
    const updated = [...officePositions];
    updated[index] = { ...updated[index], [field]: value };
    setOfficePositions(updated);
  };

  const handleAddOffice = async () => {
    if (!newOfficeName.trim()) {
      alert('Please enter an office name');
      return;
    }
    
    try {
      // Create office first
      const response = await fetch('/api/masters/offices', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ name: newOfficeName })
      });

      if (!response.ok) {
        throw new Error('Failed to add office');
      }
      
      // If positions are provided, add them too
      if (officePositions.length > 0) {
        for (const position of officePositions) {
          if (position.positionName.trim()) {
            const response = await fetch('/api/masters/office-specific-position', {
              method: 'POST',
              headers: getAuthHeaders(),
              body: JSON.stringify({
                officeName: newOfficeName,
                positionName: position.positionName,
                reportingTime: position.reportingTime,
                dutyHours: position.dutyHours
              })
            });

            if (!response.ok) {
              throw new Error('Failed to add position to office');
            }
          }
        }
      }
      
      alert('Office added successfully!');
      setNewOfficeName('');
      setOfficePositions([]);
      setShowOfficeModal(false);
      
      // Refresh all data
      await Promise.all([
        fetchOffices(),
        fetchPositions(),
        fetchOfficeSummary()
      ]);
      
    } catch (error) {
      console.error(error);
      alert('Failed to add office');
    }
  };

  // Position Master Functions
  const handleAddPositionToOffice = async () => {
    if (!newPositionName.trim()) {
      alert('Please enter a position name');
      return;
    }
    if (!selectedOfficeForPosition) {
      alert('Please select an office for this position');
      return;
    }
    
    try {
      const response = await fetch('/api/masters/office-specific-position', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          officeName: selectedOfficeForPosition,
          positionName: newPositionName,
          reportingTime: positionReportingTime,
          dutyHours: positionDutyHours
        })
      });

      if (!response.ok) {
        throw new Error('Failed to add position');
      }
      
      alert('Position added successfully!');
      setNewPositionName('');
      setSelectedOfficeForPosition('');
      setPositionReportingTime('09:00');
      setPositionDutyHours(8);
      setShowPositionModal(false);
      
      // Refresh data
      await Promise.all([
        fetchPositions(),
        fetchOfficeSummary()
      ]);
      
    } catch (error) {
      console.error(error);
      alert('Failed to add position');
    }
  };

  return (
    <MainLayout 
      title="Dashboard" 
      subtitle="Overview of your payroll system"
    >
      <div className="space-y-6">
        {/* Real-time Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <MetricCard
            title="Total Employees"
            value={totalEmployees !== null ? totalEmployees.toString() : '...'}
            color="blue"
          />
          <MetricCard
            title="Monthly Payroll"
            value={
              totalMonthlySalary !== null
                ? `AED ${totalMonthlySalary.toLocaleString()}`
                : '...'
            }
            color="green"
          />
          <MetricCard
            title="Total Offices"
            value={officeSummary.length.toString()}
            color="purple"
          />
        </div>

        {/* Office-wise Cards - Enhanced with real-time updates */}
        {officeSummary.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {officeSummary.map((office, index) => (
              <MetricCard
                key={`${office.office}-${index}`}
                title={`${office.office} Office`}
                value={
                  <>
                    <div className="text-sm font-semibold text-blue-600">
                      Employees: {office.totalEmployees || 0}
                    </div>
                    <div className="text-sm font-semibold text-green-600">
                      Salary: AED {(office.totalSalary || 0).toLocaleString()}
                    </div>
                  </>
                }
                color="purple"
              />
            ))}
          </div>
        ) : (
          <div className="bg-gray-50 rounded-lg p-8 text-center">
            <p className="text-gray-500">No office data available. Add offices to see summaries here.</p>
          </div>
        )}


      </div>
    </MainLayout>
  );
};