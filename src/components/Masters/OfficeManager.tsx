import React, { useState, useEffect } from 'react';
import { X, Plus, Edit, Trash2, Building2, Save, XCircle } from 'lucide-react';

interface Office {
  office_id: number;
  office_name: string;
  location: string;
  employeeCount?: number;
}

interface OfficeManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onDataChange?: () => void;
}

export const OfficeManager: React.FC<OfficeManagerProps> = ({
  isOpen,
  onClose,
  onDataChange
}) => {
  const [offices, setOffices] = useState<Office[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingOffice, setEditingOffice] = useState<Office | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  
  const [officeForm, setOfficeForm] = useState({ name: '', location: '' });

  const fetchOffices = async () => {
    setLoading(true);
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
      alert('Failed to fetch offices. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchOffices();
    }
  }, [isOpen]);

  const handleCreateOffice = async () => {
    if (!officeForm.name.trim()) {
      alert('⚠️ Office name is required');
      return;
    }

    try {
      const response = await fetch('/api/masters/offices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(officeForm)
      });

      if (response.ok) {
        alert('✅ Office created successfully!');
        setOfficeForm({ name: '', location: '' });
        fetchOffices();
        onDataChange?.();
      } else {
        const errorData = await response.json();
        if (response.status === 400 && errorData.error.includes('already exists')) {
          alert('⚠️ Office name already exists. Please choose a different name.');
        } else {
          alert('❌ Failed to create office. Please try again.');
        }
      }
    } catch (error) {
      alert('❌ Network error. Please check your connection and try again.');
    }
  };

  const handleUpdateOffice = async () => {
    if (!editingOffice || !officeForm.name.trim()) return;

    try {
      const response = await fetch(`/api/masters/offices/${editingOffice.office_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(officeForm)
      });

      if (response.ok) {
        alert('✅ Office updated successfully!');
        setEditingOffice(null);
        setOfficeForm({ name: '', location: '' });
        fetchOffices();
        onDataChange?.();
      } else {
        const errorData = await response.json();
        if (response.status === 400 && errorData.error.includes('already exists')) {
          alert('⚠️ Office name already exists. Please choose a different name.');
        } else {
          alert('❌ Failed to update office. Please try again.');
        }
      }
    } catch (error) {
      alert('❌ Network error. Please check your connection and try again.');
    }
  };

  const handleDeleteOffice = async (id: number) => {
    try {
      const response = await fetch(`/api/masters/offices/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        alert('✅ Office deleted successfully!');
        fetchOffices();
        onDataChange?.();
      } else {
        const errorData = await response.json();
        if (response.status === 400 && errorData.error.includes('active employees')) {
          alert('⚠️ Cannot delete office with active employees. Please reassign employees first.');
        } else {
          alert('❌ Failed to delete office. Please try again.');
        }
      }
    } catch (error) {
      alert('❌ Network error. Please check your connection and try again.');
    }
  };

  const startEditOffice = (office: Office) => {
    setEditingOffice(office);
    setOfficeForm({ name: office.office_name, location: office.location || '' });
  };

  const cancelEdit = () => {
    setEditingOffice(null);
    setOfficeForm({ name: '', location: '' });
  };

  const openDeleteModal = (id: number, name: string) => {
    if (window.confirm(`Are you sure you want to delete the office "${name}"? This action cannot be undone.`)) {
      handleDeleteOffice(id);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-40">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-2xl font-semibold text-gray-900">Manage Offices</h2>
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
              {/* Add Office Form */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-medium mb-4">
                  {editingOffice ? 'Edit Office' : 'Add New Office'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Office Name *
                    </label>
                    <input
                      type="text"
                      value={officeForm.name}
                      onChange={(e) => setOfficeForm({ ...officeForm, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter office name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Location
                    </label>
                    <input
                      type="text"
                      value={officeForm.location}
                      onChange={(e) => setOfficeForm({ ...officeForm, location: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter location"
                    />
                  </div>
                </div>
                <div className="flex space-x-3 mt-4">
                  <button
                    onClick={editingOffice ? handleUpdateOffice : handleCreateOffice}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {editingOffice ? 'Update' : 'Create'} Office
                  </button>
                  {editingOffice && (
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

              {/* Offices List */}
              <div className="space-y-3">
                {loading ? (
                  <div className="text-center py-8">Loading offices...</div>
                ) : offices.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No offices found. Create your first office above.
                  </div>
                ) : (
                  offices.map((office) => (
                    <div key={office.office_id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                      <div>
                        <h4 className="font-medium text-gray-900">{office.office_name}</h4>
                        <p className="text-sm text-gray-600">{office.location || 'No location specified'}</p>
                        {office.employeeCount !== undefined && (
                          <p className="text-xs text-blue-600">{office.employeeCount} employees</p>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => startEditOffice(office)}
                          className="p-2 text-blue-600 hover:bg-blue-100 rounded-full"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openDeleteModal(office.office_id, office.office_name)}
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

    </>
  );
};
