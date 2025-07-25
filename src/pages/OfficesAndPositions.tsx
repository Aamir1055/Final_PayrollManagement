import React, { useState, useEffect } from 'react';
import { MainLayout } from '../components/Layout/MainLayout';
import { api } from '../utils/api';
import { Plus, Edit, Trash2 } from 'lucide-react';

interface Office {
  office_id: number;
  office_name: string;
  location: string;
}

interface Position {
  position_id: number;
  position_name: string;
}

export const OfficesAndPositions: React.FC = () => {
  const [offices, setOffices] = useState<Office[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchOffices = async () => {
    try {
      const response = await api.get('/masters/offices');
      setOffices(response.data);
    } catch (error) {
      console.error('Error fetching offices:', error);
    }
  };

  const fetchPositions = async () => {
    try {
      const response = await api.get('/masters/positions');
      setPositions(response.data);
    } catch (error) {
      console.error('Error fetching positions:', error);
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchOffices(), fetchPositions()]).finally(() => setLoading(false));
  }, []);

  return (
    <MainLayout title="Manage Offices & Positions" subtitle="Oversee all company offices and job positions">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Offices management */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold mb-4">Offices</h2>
          <button className="bg-blue-500 text-white px-4 py-2 rounded-md mb-4 flex items-center">
            <Plus className="mr-2" /> Add Office
          </button>
          <ul className="space-y-4">
            {offices.map((office) => (
              <li key={office.office_id} className="flex justify-between items-center p-4 border rounded-lg">
                <div>
                  <p className="font-semibold">{office.office_name}</p>
                  <p className="text-sm text-gray-500">{office.location}</p>
                </div>
                <div className="flex space-x-2">
                  <button className="text-blue-500"><Edit /></button>
                  <button className="text-red-500"><Trash2 /></button>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Positions management */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold mb-4">Positions</h2>
          <button className="bg-blue-500 text-white px-4 py-2 rounded-md mb-4 flex items-center">
            <Plus className="mr-2" /> Add Position
          </button>
          <ul className="space-y-4">
            {positions.map((position) => (
              <li key={position.position_id} className="flex justify-between items-center p-4 border rounded-lg">
                <p className="font-semibold">{position.position_name}</p>
                <div className="flex space-x-2">
                  <button className="text-blue-500"><Edit /></button>
                  <button className="text-red-500"><Trash2 /></button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </MainLayout>
  );
};
