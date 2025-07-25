import React, { useState, useCallback, useRef } from 'react';
import { Upload, Download, Eye, FileText, AlertCircle, CheckCircle } from 'lucide-react';

interface AttendanceRecord {
  employee_id: string;
  employee_name: string;
  date: string;
  time_in: string;
  time_out: string;
  status: 'present' | 'absent' | 'late' | 'half_day' | 'leave';
  remarks?: string;
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

interface AttendanceUploadProps {
  onUploadComplete?: (records: AttendanceRecord[]) => void;
}

// --- DATE HELPERS ---
function toMDY(dateStr: string) {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr || '';
  const [y, m, d] = dateStr.split('-');
  return `${parseInt(m, 10)}/${parseInt(d, 10)}/${y}`;
}

function convertDMYtoYMD(dateStr: string) {
  if (!dateStr) {
    console.warn('convertDMYtoYMD received empty date string');
    return '';
  }
  const trimmed = dateStr.trim();
  console.log(`convertDMYtoYMD input: "${trimmed}"`);
  let match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(trimmed);
  if (match) {
    const [_, dd, mm, yyyy] = match;
    const converted = `${yyyy}-${mm}-${dd}`;
    console.log(`Converted "${trimmed}" to "${converted}"`);
    return converted;
  }
  match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (match) {
    console.log(`Date is already in YYYY-MM-DD format: "${trimmed}"`);
    return trimmed;
  }
  console.warn(`Date format unknown: "${dateStr}". Returning unmodified.`);
  return trimmed;
}

const AttendanceUpload: React.FC<AttendanceUploadProps> = ({ onUploadComplete }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<AttendanceRecord[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sampleData: AttendanceRecord[] = [
    {
      employee_id: 'EMP001',
      employee_name: 'John Doe',
      date: '2024-01-15',
      time_in: '09:00',
      time_out: '17:00',
      status: 'present',
      remarks: ''
    },
    {
      employee_id: 'EMP002',
      employee_name: 'Jane Smith',
      date: '2024-01-15',
      time_in: '09:30',
      time_out: '17:00',
      status: 'late',
      remarks: 'Traffic delay'
    },
    {
      employee_id: 'EMP003',
      employee_name: 'Bob Johnson',
      date: '2024-01-15',
      time_in: '',
      time_out: '',
      status: 'absent',
      remarks: 'Sick leave'
    }
  ];

  const downloadSampleFile = () => {
    const headers = [
      'Employee ID',
      'Employee Name',
      'Date (YYYY-MM-DD)',
      'Time In (HH:MM)',
      'Time Out (HH:MM)',
      'Status',
      'Remarks'
    ];
    const csvContent = [
      headers.join(','),
      ...sampleData.map(record => [
        record.employee_id,
        record.employee_name,
        record.date,
        record.time_in,
        record.time_out,
        record.status,
        record.remarks || ''
      ].join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'attendance_sample.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const validateRecord = (record: any, rowIndex: number): ValidationError[] => {
    const errors: ValidationError[] = [];
    if (!record.employee_id || !record.employee_id.trim()) {
      errors.push({
        row: rowIndex,
        field: 'employee_id',
        message: 'Employee ID is required',
        severity: 'error'
      });
    }
    if (!record.employee_name || !record.employee_name.trim()) {
      errors.push({
        row: rowIndex,
        field: 'employee_name',
        message: 'Employee name is required',
        severity: 'error'
      });
    }
    if (!record.date || !record.date.trim()) {
      errors.push({
        row: rowIndex,
        field: 'date',
        message: 'Date is required',
        severity: 'error'
      });
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(record.date)) {
      errors.push({
        row: rowIndex,
        field: 'date',
        message: 'Date must be in YYYY-MM-DD format',
        severity: 'error'
      });
    }
    const validStatuses = ['present', 'absent', 'late', 'half_day', 'leave'];
    if (!record.status || !validStatuses.includes(record.status)) {
      errors.push({
        row: rowIndex,
        field: 'status',
        message: `Status must be one of: ${validStatuses.join(', ')}`,
        severity: 'error'
      });
    }
    if (record.status === 'present' || record.status === 'late') {
      if (!record.time_in || !record.time_in.trim()) {
        errors.push({
          row: rowIndex,
          field: 'time_in',
          message: 'Time In is required for present/late status',
          severity: 'error'
        });
      } else if (!/^\d{2}:\d{2}$/.test(record.time_in)) {
        errors.push({
          row: rowIndex,
          field: 'time_in',
          message: 'Time In must be in HH:MM format',
          severity: 'error'
        });
      }
      if (!record.time_out || !record.time_out.trim()) {
        errors.push({
          row: rowIndex,
          field: 'time_out',
          message: 'Time Out is required for present/late status',
          severity: 'warning'
        });
      } else if (!/^\d{2}:\d{2}$/.test(record.time_out)) {
        errors.push({
          row: rowIndex,
          field: 'time_out',
          message: 'Time Out must be in HH:MM format',
          severity: 'error'
        });
      }
    }
    return errors;
  };

  const parseCSV = (csvText: string): AttendanceRecord[] => {
    console.log('Parsing CSV content...');
    const lines = csvText.split('\n').filter(line => line.trim());
    console.log('Number of lines:', lines.length);
    const headers = lines[0].split(',').map(h => h.trim());
    console.log('CSV Headers:', headers);

    const records: AttendanceRecord[] = lines.slice(1).map((line, idx) => {
      console.log(`Parsing line ${idx + 2}:`, line);
      const values = line.split(',').map(v => v.trim());
      const rawDate = values[2] || '';
      const convertedDate = convertDMYtoYMD(rawDate);
      console.log(`Line ${idx + 2}: raw date = "${rawDate}", converted date = "${convertedDate}"`);
      return {
        employee_id: values[0] || '',
        employee_name: values[1] || '',
        date: convertedDate || '',
        time_in: values[3] || '',
        time_out: values[4] || '',
        status: (values[5] || '') as AttendanceRecord['status'],
        remarks: values[6] || ''
      };
    });

    console.log('All parsed records:', records);
    return records;
  };

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('File selection triggered.');
    const file = event.target.files?.[0];
    console.log('Selected file:', file);
    if (!file) return;
    if (file.type !== 'text/csv' && !file.name.toLowerCase().endsWith('.csv')) {
      alert('⚠️ Please select a CSV file');
      console.warn('Selected file is not a CSV:', file.type);
      return;
    }
    setSelectedFile(file);
    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      console.log('File loaded.');
      const csvText = e.target?.result as string;
      console.log('CSV Text preview:', csvText.slice(0, 200));
      try {
        const records = parseCSV(csvText);

        const allErrors: ValidationError[] = [];
        records.forEach((record, idx) => {
          const errors = validateRecord(record, idx + 2);
          allErrors.push(...errors);
        });

        setPreviewData(records);
        setValidationErrors(allErrors);
        setShowPreview(true);
      } catch (error) {
        alert('❌ Error reading file. Please check the file format.');
        console.error('Error parsing CSV:', error);
      } finally {
        setIsProcessing(false);
      }
    };
    reader.onerror = (e) => {
      alert('❌ Error reading file.');
      console.error('FileReader error:', e);
      setIsProcessing(false);
    };
    reader.readAsText(file);
  }, []);

  const handleUpload = async () => {
    if (validationErrors.some(e => e.severity === 'error')) {
      alert('⚠️ Please fix all errors before uploading');
      return;
    }
    setIsProcessing(true);
    try {
      const response = await fetch('/api/attendance/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ records: previewData })
      });
      if (response.ok) {
        alert('✅ Attendance records uploaded successfully!');
        onUploadComplete?.(previewData);
        setSelectedFile(null);
        setPreviewData([]);
        setValidationErrors([]);
        setShowPreview(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      } else {
        const errorData = await response.json();
        if (errorData.error && errorData.error.includes('Invalid employee IDs')) {
          alert(`❌ Upload failed: ${errorData.error}\n\nPlease verify that all Employee IDs exist in the system.`);
        } else {
          alert(`❌ Upload failed: ${errorData.error || 'Unknown error'}`);
        }
      }
    } catch (error) {
      alert('❌ Network error. Please check your connection and try again.');
      console.error('Upload error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusColor = (status: AttendanceRecord['status']) => {
    switch (status) {
      case 'present': return 'text-green-600';
      case 'late': return 'text-yellow-600';
      case 'absent': return 'text-red-600';
      case 'half_day': return 'text-blue-600';
      case 'leave': return 'text-purple-600';
      default: return 'text-gray-600';
    }
  };

  const errorCount = validationErrors.filter(e => e.severity === 'error').length;
  const warningCount = validationErrors.filter(e => e.severity === 'warning').length;

  const dates = previewData.map(r => r.date).filter(Boolean).sort();
  const minDate = dates[0];
  const maxDate = dates[dates.length - 1];

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Upload Attendance Records</h2>
        <button
          onClick={downloadSampleFile}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
        >
          <Download className="w-4 h-4" />
          Download Sample
        </button>
      </div>

      <div className="mb-6">
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600 mb-4">
            Upload a CSV file with attendance records. Download the sample file to see the required format.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="flex items-center gap-2 mx-auto px-6 py-3 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            {isProcessing ? 'Processing...' : 'Choose File'}
          </button>
          {selectedFile && (
            <p className="mt-2 text-sm text-gray-600">
              Selected: {selectedFile.name}
            </p>
          )}
        </div>
      </div>

      {showPreview && (
        <>
          <div className="mb-6">
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-500" />
                <span className="font-medium">Records: {previewData.length}</span>
              </div>
              {errorCount > 0 && (
                <div className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="w-5 h-5" />
                  <span className="font-medium">Errors: {errorCount}</span>
                </div>
              )}
              {warningCount > 0 && (
                <div className="flex items-center gap-2 text-yellow-600">
                  <AlertCircle className="w-5 h-5" />
                  <span className="font-medium">Warnings: {warningCount}</span>
                </div>
              )}
              {errorCount === 0 && warningCount === 0 && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">All records valid</span>
                </div>
              )}
            </div>
          </div>

          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Eye className="w-5 h-5 text-blue-500" />
              <h3 className="text-lg font-semibold">Preview</h3>
            </div>
            {dates.length > 0 && (
              <div className="mb-2 text-gray-700 font-medium">
                Date Range:&nbsp;{toMDY(minDate)} - {toMDY(maxDate)}
              </div>
            )}
            <div className="max-h-96 overflow-y-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left">Employee ID</th>
                    <th className="px-4 py-2 text-left">Name</th>
                    <th className="px-4 py-2 text-left">Date</th>
                    <th className="px-4 py-2 text-left">Time In</th>
                    <th className="px-4 py-2 text-left">Time Out</th>
                    <th className="px-4 py-2 text-left">Status</th>
                    <th className="px-4 py-2 text-left">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((record, index) => {
                    const rowErrors = validationErrors.filter(e => e.row === index + 2);
                    console.log(`Preview row ${index + 2}:`, record);
                    return (
                      <tr key={index} className={`border-b ${rowErrors.length > 0 ? 'bg-red-50' : ''}`}>
                        <td className="px-4 py-2">{record.employee_id}</td>
                        <td className="px-4 py-2">{record.employee_name}</td>
                        <td className="px-4 py-2">{record.date}</td>
                        <td className="px-4 py-2">{record.time_in}</td>
                        <td className="px-4 py-2">{record.time_out}</td>
                        <td className={`px-4 py-2 font-medium ${getStatusColor(record.status)}`}>
                          {record.status}
                        </td>
                        <td className="px-4 py-2">{record.remarks}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {validationErrors.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3 text-red-600">Validation Issues</h3>
          <div className="max-h-60 overflow-y-auto space-y-2">
            {validationErrors.map((error, index) => (
              <div
                key={index}
                className={`p-3 rounded-md ${
                  error.severity === 'error' ? 'bg-red-50 border border-red-200' : 'bg-yellow-50 border border-yellow-200'
                }`}
              >
                <div className={`flex items-center gap-2 ${
                  error.severity === 'error' ? 'text-red-600' : 'text-yellow-600'
                }`}>
                  <AlertCircle className="w-4 h-4" />
                  <span className="font-medium">
                    Row {error.row}, {error.field}: {error.message}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showPreview && (
        <div className="flex justify-end gap-3">
          <button
            onClick={() => {
              setShowPreview(false);
              setPreviewData([]);
              setValidationErrors([]);
              setSelectedFile(null);
              if (fileInputRef.current) fileInputRef.current.value = '';
            }}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={isProcessing || errorCount > 0}
            className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            {isProcessing ? 'Uploading...' : 'Upload Records'}
          </button>
        </div>
      )}
    </div>
  );
};

export default AttendanceUpload;
