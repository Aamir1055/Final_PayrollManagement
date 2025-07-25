import React, { useState, useEffect } from 'react';
import { X, Plus, Edit, Trash2, Building2, Briefcase, Save, XCircle } from 'lucide-react';
import { api } from '../../utils/api';
import { useToast } from '../UI/ToastContainer';
import { DeleteConfirmModal } from '../UI/DeleteConfirmModal';

interface Office {
  office_id: number;
  office_name: string;
  location: string;
  employeeCount?: number;
}

interface Position {
  position_id: number;
  position_name: string;
  description: string;
}

interface OfficePositionManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onDataChange?: () => void;
}

export const OfficePositionManager: React.FC<OfficePositionManagerProps> = ({
  isOpen,
  onClose,
  onDataChange
}) => {
  const [activeTab, setActiveTab] = useState<'offices' | 'positions'>('offices');
  const [offices, setOffices] = useState<Office[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingOffice, setEditingOffice] = useState<Office | null>(null);
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'office' | 'position'; id: number; name: string } | null>(null);
  
  const [officeForm, setOfficeForm] = useState({ name: '', location: '' });
  const [positionForm, setPositionForm] = useState({ title: '', description: '' });
  
  const toast = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [officesRes, positionsRes] = await Promise.all([
        api.get('/masters/offices'),
        api.get('/masters/positions')
      ]);
      setOffices(officesRes.data);
      setPositions(positionsRes.data);
    } catch (error) {
      toast.showError('Error', 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const handleCreateOffice = async () => {
    if (!officeForm.name.trim()) {
      toast.showWarning('Validation Error', 'Office name is required');
      return;
    }

    try {
      await api.post('/masters/offices', officeForm);
      toast.showSuccess('Success', 'Office created successfully');
      setOfficeForm({ name: '', location: '' });
      fetchData();
      onDataChange?.();
    } catch (error) {
      toast.showError('Error', 'Failed to create office');
    }
  };

  const handleUpdateOffice = async () => {
    if (!editingOffice || !officeForm.name.trim()) return;

    try {
      await api.put(`/masters/offices/${editingOffice.office_id}`, officeForm);
      toast.showSuccess('Success', 'Office updated successfully');
      setEditingOffice(null);
      setOfficeForm({ name: '', location: '' });
      fetchData();
      onDataChange?.();
    } catch (error) {
      toast.showError('Error', 'Failed to update office');
    }
  };

  const handleDeleteOffice = async (id: number) => {
    try {
      await api.delete(`/masters/offices/${id}`);
      toast.showSuccess('Success', 'Office deleted successfully');
      fetchData();
      onDataChange?.();
    } catch (error) {
      toast.showError('Error', 'Failed to delete office');
    }
  };

  const handleCreatePosition = async () => {
    if (!positionForm.title.trim()) {
      toast.showWarning('Validation Error', 'Position title is required');
      return;
    }

    try {
      await api.post('/masters/positions', positionForm);
      toast.showSuccess('Success', 'Position created successfully');
      setPositionForm({ title: '', description: '' });
      fetchData();
      onDataChange?.();
    } catch (error) {
      toast.showError('Error', 'Failed to create position');
    }
  };

  const handleUpdatePosition = async () => {
    if (!editingPosition || !positionForm.title.trim()) return;

    try {
      await api.put(`/masters/positions/${editingPosition.position_id}`, positionForm);
      toast.showSuccess('Success', 'Position updated successfully');
      setEditingPosition(null);
      setPositionForm({ title: '', description: '' });
      fetchData();
      onDataChange?.();
    } catch (error) {
      toast.showError('Error', 'Failed to update position');
    }
  };

  const handleDeletePosition = async (id: number) => {
    try {
      await api.delete(`/masters/positions/${id}`);
      toast.showSuccess('Success', 'Position deleted successfully');
      fetchData();
      onDataChange?.();
    } catch (error) {
      toast.showError('Error', 'Failed to delete position');
    }
  };

  const startEditOffice = (office: Office) => {
    setEditingOffice(office);
    setOfficeForm({ name: office.office_name, location: office.location || '' });
  };

  const startEditPosition = (position: Position) => {
    setEditingPosition(position);
    setPositionForm({ title: position.position_name, description: position.description || '' });
  };

  const cancelEdit = () => {
    setEditingOffice(null);
    setEditingPosition(null);
    setOfficeForm({ name: '', location: '' });
    setPositionForm({ title: '', description: '' });
  };

  const openDeleteModal = (type: 'office' | 'position', id: number, name: string) => {
    setDeleteTarget({ type, id, name });
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    
    if (deleteTarget.type === 'office') {
      handleDeleteOffice(deleteTarget.id);
    } else {
      handleDeletePosition(deleteTarget.id);
    }
    
    setDeleteTarget(null);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-40">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-2xl font-semibold text-gray-900">Manage Offices & Positions</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex">
              <button
                onClick={() => setActiveTab('offices')}
                className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === 'offices'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Building2 className="w-4 h-4 inline mr-2" />
                Offices ({offices.length})
              </button>
              <button
                onClick={() => setActiveTab('positions')}
                className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === 'positions'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Briefcase className="w-4 h-4 inline mr-2" />
                Positions ({positions.length})
              </button>
            </nav>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            {activeTab === 'offices' && (
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
                            onClick={() => openDeleteModal('office', office.office_id, office.office_name)}
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
            )}

            {activeTab === 'positions' && (
              <div className="space-y-6">
                {/* Add Position Form */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-medium mb-4">
                    {editingPosition ? 'Edit Position' : 'Add New Position'}
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Position Title *
                      </label>
                      <input
                        type="text"
                        value={positionForm.title}
                        onChange={(e) => setPositionForm({ ...positionForm, title: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter position title"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <textarea
                        value={positionForm.description}
                        onChange={(e) => setPositionForm({ ...positionForm, description: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter position description"
                        rows={3}
                      />
                    </div>
                  </div>
                  <div className="flex space-x-3 mt-4">
                    <button
                      onClick={editingPosition ? handleUpdatePosition : handleCreatePosition}
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

                {/* Positions List */}
                <div className="space-y-3">
                  {loading ? (
                    <div className="text-center py-8">Loading positions...</div>
                  ) : positions.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No positions found. Create your first position above.
                    </div>
                  ) : (
                    positions.map((position) => (
                      <div key={position.position_id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                        <div>
                          <h4 className="font-medium text-gray-900">{position.position_name}</h4>
                          <p className="text-sm text-gray-600">{position.description || 'No description provided'}</p>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => startEditPosition(position)}
                            className="p-2 text-blue-600 hover:bg-blue-100 rounded-full"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openDeleteModal('position', position.position_id, position.position_name)}
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
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        title={`Delete ${deleteTarget?.type || ''}`}
        message={`Are you sure you want to delete this ${deleteTarget?.type}? This action cannot be undone.`}
        itemName={deleteTarget?.name || ''}
        confirmText="delete"
      />
    </>
  );
};
