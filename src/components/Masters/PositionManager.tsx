// SAME IMPORTS AS BEFORE
import React, { useState, useEffect } from 'react';
import { X, Plus, Edit, Trash2, Briefcase, Save, XCircle } from 'lucide-react';

interface Office {
  office_id: number;
  office_name: string;
  location: string;
}

interface Position {
  position_id: number;
  position_name: string;
  description: string;
  office_id?: number;
  office_name?: string;
  reporting_time?: string;
  duty_hours?: string;
}

interface PositionManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onDataChange?: () => void;
}

export const PositionManager: React.FC<PositionManagerProps> = ({
  isOpen,
  onClose,
  onDataChange
}) => {
  const [positions, setPositions] = useState<Position[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);
  const [positionForm, setPositionForm] = useState({
    title: '',
    description: '',
    office_id: '',
    reporting_time: '',
    duty_hours: ''
  });

  const fetchPositions = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/masters/positions', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setPositions(data);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error fetching positions:', errorData);
      }
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOffices = async () => {
    try {
      const response = await fetch('/api/masters/offices', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setOffices(data);
      }
    } catch (error) {
      console.error('Error fetching offices:', error);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchPositions();
      fetchOffices();
    }
  }, [isOpen]);

  const handleCreateOrUpdate = async () => {
    if (!positionForm.title.trim()) return alert('⚠️ Title required');
    if (!positionForm.office_id) return alert('⚠️ Select an office');
    if (!positionForm.reporting_time.trim()) return alert('⚠️ Reporting time required');
    if (!positionForm.duty_hours.trim()) return alert('⚠️ Duty hours required');

    const url = editingPosition
      ? `/api/masters/positions/${editingPosition.position_id}`
      : '/api/masters/positions';

    const method = editingPosition ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          title: positionForm.title,
          description: positionForm.description,
          office_id: positionForm.office_id,
          reporting_time: positionForm.reporting_time,
          duty_hours: positionForm.duty_hours
        })
      });

      if (response.ok) {
        alert(`✅ Position ${editingPosition ? 'updated' : 'created'} successfully!`);
        setPositionForm({ title: '', description: '', office_id: '', reporting_time: '', duty_hours: '' });
        setEditingPosition(null);
        fetchPositions();
        onDataChange?.();
      } else {
        const errorData = await response.json();
        alert(errorData?.error || '❌ Operation failed');
      }
    } catch (error) {
      alert('❌ Network error.');
    }
  };

  const handleDeletePosition = async (id: number) => {
    try {
      const response = await fetch(`/api/masters/positions/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        alert('✅ Position deleted');
        fetchPositions();
        onDataChange?.();
      } else {
        const errorData = await response.json();
        alert(errorData?.error || '❌ Could not delete position');
      }
    } catch (error) {
      alert('❌ Network error.');
    }
  };

  const startEditPosition = (pos: Position) => {
    setEditingPosition(pos);
    setPositionForm({
      title: pos.position_name,
      description: pos.description || '',
      office_id: pos.office_id?.toString() || '',
      reporting_time: pos.reporting_time || '',
      duty_hours: pos.duty_hours || ''
    });
  };

  const cancelEdit = () => {
    setEditingPosition(null);
    setPositionForm({
      title: '',
      description: '',
      office_id: '',
      reporting_time: '',
      duty_hours: ''
    });
  };

  const openDeleteModal = (id: number, name: string) => {
    if (window.confirm(`Delete position "${name}"? This action cannot be undone.`)) {
      handleDeletePosition(id);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-40">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-semibold text-gray-900">Manage Positions</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="space-y-6">
            {/* Form */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-medium mb-4">
                {editingPosition ? 'Edit Position' : 'Add New Position'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Position Title *</label>
                  <input
                    value={positionForm.title}
                    onChange={(e) => setPositionForm({ ...positionForm, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500"
                    placeholder="Enter title"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Office *</label>
                  <select
                    value={positionForm.office_id}
                    onChange={(e) => setPositionForm({ ...positionForm, office_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500"
                  >
                    <option value="">Select Office</option>
                    {offices.map(o => (
                      <option key={o.office_id} value={o.office_id}>{o.office_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Reporting Time *</label>
                  <input
                    type="time"
                    value={positionForm.reporting_time}
                    onChange={(e) => setPositionForm({ ...positionForm, reporting_time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Duty Hours *</label>
                  <input
                    type="number"
                    value={positionForm.duty_hours}
                    onChange={(e) => setPositionForm({ ...positionForm, duty_hours: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500"
                    placeholder="e.g., 8"
                    min="1"
                    max="24"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    value={positionForm.description}
                    onChange={(e) => setPositionForm({ ...positionForm, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500"
                    rows={3}
                  />
                </div>
              </div>
              <div className="flex space-x-3 mt-4">
                <button
                  onClick={handleCreateOrUpdate}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {editingPosition ? 'Update' : 'Create'} Position
                </button>
                {editingPosition && (
                  <button
                    onClick={cancelEdit}
                    className="flex items-center px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Cancel
                  </button>
                )}
              </div>
            </div>

            {/* List */}
            <div className="space-y-3">
              {loading ? (
                <div className="text-center py-8">Loading positions...</div>
              ) : positions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No positions found.</div>
              ) : (
                positions.map((pos) => (
                  <div key={pos.position_id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{pos.position_name}</h4>
                      <p className="text-sm text-gray-600">{pos.description || 'No description provided'}</p>
                      <div className="flex flex-wrap gap-4 mt-2 text-xs">
                        <div className="text-gray-700"><strong>Position ID:</strong> {pos.position_id}</div>
                        <div className="text-gray-700"><strong>Office ID:</strong> {pos.office_id ?? 'N/A'}</div>
                        <div className="text-blue-600"><strong>Office:</strong> {pos.office_name || 'Not assigned'}</div>
                        <div className="text-green-600"><strong>Reporting:</strong> {pos.reporting_time || 'Not set'}</div>
                        <div className="text-purple-600"><strong>Duty Hours:</strong> {pos.duty_hours || 'Not set'}</div>
                      </div>
                    </div>
                    <div className="flex space-x-2 ml-4">
                      <button
                        onClick={() => startEditPosition(pos)}
                        className="p-2 text-blue-600 hover:bg-blue-100 rounded-full"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openDeleteModal(pos.position_id, pos.position_name)}
                        className="p-2 text-red-600 hover:bg-red-100 rounded-full"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
