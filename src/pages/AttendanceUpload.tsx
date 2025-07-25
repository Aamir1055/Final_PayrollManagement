import React, { useState } from 'react';
import { MainLayout } from '../components/Layout/MainLayout';
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom';
import { 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  FileDown, 
  Upload, 
  FileText, 
  Calendar,
  Users,
  TrendingUp
} from 'lucide-react';

// Helper: Convert Excel serial date to YYYY-MM-DD string
function excelSerialToISODate(serial: number | string): string {
  if (typeof serial === 'number') {
    const excelEpoch = Date.UTC(1899, 11, 30);
    const ms = excelEpoch + (serial * 86400 * 1000);
    const date = new Date(ms);
    return date.toISOString().slice(0, 10);
  }
  if (typeof serial === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(serial)) return serial;
  return String(serial);
}

const SAMPLE_DATA = [
  { 'EmployeeID': 'EMP001', 'Name': 'John Doe', 'Date': '2025-01-01', 'Punch In': '09:00', 'Punch Out': '17:00' },
  { 'EmployeeID': 'EMP002', 'Name': 'Jane Smith', 'Date': '2025-01-01', 'Punch In': '09:15', 'Punch Out': '16:45' },
  { 'EmployeeID': 'EMP001', 'Name': 'John Doe', 'Date': '2025-01-02', 'Punch In': '08:45', 'Punch Out': '17:30' }
];

const AttendanceUpload: React.FC = () => {
  const navigate = useNavigate();
  const [previewRows, setPreviewRows] = useState<Array<any>>([]);
  const [headers, setHeaders] = useState<Array<string>>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadMsg, setUploadMsg] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadStats, setUploadStats] = useState<any>(null);
  // Date range now unused
  // const [fromDate, setFromDate] = useState('');
  // const [toDate, setToDate] = useState('');
  // const [showDateRange, setShowDateRange] = useState(false);

  // Download sample/template
  const downloadSample = () => {
    const ws = XLSX.utils.json_to_sheet(SAMPLE_DATA);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance Template');
    XLSX.writeFile(wb, 'attendance_template.xlsx');
  };

  // File selection & preview with conversion
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    setUploadMsg('');
    setError('');
    setHeaders([]);
    setPreviewRows([]);
    setUploadStats(null);

    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target!.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        if (rows.length < 2) throw new Error('No data found, or missing header row.');

        const headerRow = rows[0];
        setHeaders(headerRow);

        // Validate required columns
        const requiredColumns = ['EmployeeID', 'Name', 'Date', 'Punch In', 'Punch Out'];
        const missingColumns = requiredColumns.filter(col => !headerRow.includes(col));
        if (missingColumns.length > 0) {
          throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
        }

        const dataRows = rows.slice(1, 11).map((arr) => {
          const obj: any = {};
          headerRow.forEach((k, i) => {
            if (k === 'Date' && arr[i] !== undefined && arr[i] !== null && arr[i] !== '') {
              obj[k] = excelSerialToISODate(arr[i]);
            } else {
              obj[k] = arr[i] ?? '';
            }
          });
          return obj;
        });

        const validRows = dataRows.filter(row => Object.values(row).some(Boolean));
        setPreviewRows(validRows);

        // Date range: find min/max in string order and use as is (no parsing as JS Date)
        let sortedDates = validRows
          .map(row => row.Date)
          .filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d))
          .sort();
        const dateRangeObj = sortedDates.length > 0 ? {
          start: sortedDates[0],
          end: sortedDates[sortedDates.length - 1]
        } : null;

        // Calculate preview stats
        const totalRows = rows.length - 1;
        const uniqueEmployees = new Set(validRows.map(row => row['EmployeeID'])).size;

        setUploadStats({
          totalRecords: totalRows,
          // validRecords: validRows.length, // REMOVED
          uniqueEmployees,
          dateRange: dateRangeObj
        });

      } catch (err: any) {
        setError(`⚠️ Could not parse file: ${err.message}`);
        setPreviewRows([]);
        setHeaders([]);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Upload attendance data
  const handleUpload = async () => {
    setError('');
    setUploadMsg('');
    if (!selectedFile) {
      setError('Please select a file to upload');
      return;
    }
    
    setLoading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const res = await fetch('/api/attendance/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setUploadMsg(`✅ ${data.recordsProcessed} records uploaded successfully!`);
        // Clear form after successful upload
        setTimeout(() => {
          setSelectedFile(null);
          setPreviewRows([]);
          setHeaders([]);
          setUploadStats(null);
        }, 2000);
      } else {
        if (data.invalidEmployeeIds && data.invalidEmployeeIds.length > 0) {
          setError(`❌ Invalid Employee IDs found: ${data.invalidEmployeeIds.join(', ')}. Please verify these Employee IDs exist in the system and try again.`);
        } else {
          setError(data.message || 'Upload failed');
        }
      }
    } catch (err) {
      setError('Failed to upload. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout title="Attendance Management" subtitle="Upload and manage employee attendance data">
      <div className="space-y-8">
        
        {/* Header Stats */}
        {uploadStats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Total Records</p>
                  <p className="text-3xl font-bold">{uploadStats.totalRecords}</p>
                </div>
                <FileText className="w-8 h-8 text-blue-200" />
              </div>
            </div>
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">Employees</p>
                  <p className="text-3xl font-bold">{uploadStats.uniqueEmployees}</p>
                </div>
                <Users className="w-8 h-8 text-purple-200" />
              </div>
            </div>
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm font-medium">Date Range</p>
                  <p className="text-sm font-semibold">
                    {uploadStats.dateRange ? `${uploadStats.dateRange.start} - ${uploadStats.dateRange.end}` : 'N/A'}
                  </p>
                </div>
                <Calendar className="w-8 h-8 text-orange-200" />
              </div>
            </div>
          </div>
        )}

        {/* Upload Section */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-8 py-6">
            <div className="flex items-center space-x-4">
              <div className="bg-white/20 p-3 rounded-full">
                <Upload className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Upload Attendance Data</h2>
                <p className="text-indigo-100 mt-1">Upload daily or monthly punch-in sheets</p>
              </div>
            </div>
          </div>
          <div className="p-8">
            {/* File Upload Area */}
            <div className="max-w-2xl mx-auto">
              <div className="space-y-6">
                <div>
                  <label className="block text-lg font-semibold text-gray-900 mb-4">
                    Select Attendance File
                  </label>
                  <div className="relative">
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileChange}
                      className="hidden"
                      id="file-upload"
                    />
                    <label
                      htmlFor="file-upload"
                      className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-16 h-16 text-gray-400 mb-4" />
                        <p className="mb-2 text-xl font-medium text-gray-700">
                          Click to upload attendance file
                        </p>
                        <p className="text-sm text-gray-500">Excel (.xlsx, .xls) or CSV files</p>
                        <p className="text-xs text-gray-400 mt-2">Maximum file size: 10MB</p>
                      </div>
                    </label>
                  </div>
                  {selectedFile && (
                    <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <FileText className="w-5 h-5 text-green-600" />
                        <div>
                          <p className="font-medium text-green-900">{selectedFile.name}</p>
                          <p className="text-sm text-green-700">
                            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex space-x-4">
                  <button
                    onClick={handleUpload}
                    disabled={loading || !selectedFile}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-6 h-6 animate-spin" />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-6 h-6" />
                        <span>Upload Attendance</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={downloadSample}
                    className="px-8 py-4 bg-gray-100 text-gray-700 rounded-xl text-lg font-semibold hover:bg-gray-200 transition-colors flex items-center space-x-2 shadow-lg hover:shadow-xl"
                  >
                    <FileDown className="w-6 h-6" />
                    <span>Sample Excel</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Preview Table */}
        {previewRows.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-8 py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="bg-white/20 p-3 rounded-full">
                    <CheckCircle className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">File Preview</h2>
                    <p className="text-green-100 mt-1">Showing first 10 rows • {previewRows.length} valid records found</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-8">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {headers.map((header, index) => (
                        <th key={index} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {previewRows.map((row, rowIndex) => (
                      <tr key={rowIndex} className="hover:bg-gray-50">
                        {headers.map((header, cellIndex) => (
                          <td key={cellIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {row[header] || '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Status Messages */}
        {(error || uploadMsg) && (
          <div className={`rounded-xl p-6 flex items-center space-x-4 ${
            error
              ? 'bg-red-50 border border-red-200 text-red-800'
              : 'bg-green-50 border border-green-200 text-green-800'
          }`}>
            {error ? (
              <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
            ) : (
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
            )}
            <span className="font-medium">{error || uploadMsg}</span>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default AttendanceUpload;
