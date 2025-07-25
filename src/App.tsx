import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth, LoginCredentials } from './context/AuthContext';
import { ToastProvider } from './components/UI/ToastContainer';
import { ErrorBoundary } from './components/ErrorBoundary';
import { MasterDataProvider } from './context/MasterDataContext';
import { GlobalMasterData } from './components/GlobalMasterData';
import { LoginForm } from './components/Auth/LoginForm';
import AddEmployeePage from './pages/AddEmployee';
import { Dashboard } from './pages/Dashboard';
import { Employees } from './pages/Employees';
import PayrollReports from './pages/PayrollReports';
import EmployeePayrollDetails from './pages/EmployeePayrollDetails';
import { Holidays } from './pages/holidays';
import { Profile } from './pages/Profile';
import  AttendanceUpload  from './pages/AttendanceUpload'; // <<--- Import here!

import 'react-toastify/dist/ReactToastify.css';
import { ToastContainer } from 'react-toastify';

const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  permission?: string;
}> = ({ children, permission }) => {
  const { isAuthenticated, hasPermission } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (permission && !hasPermission(permission)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-6">
            You don't have permission to access this page.
          </p>
          <button
            onClick={() => window.history.back()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

const AuthenticatedLoginForm: React.FC = () => {
  const { login, loading, error } = useAuth();

  const handleLogin = async (credentials: LoginCredentials) => {
    const success = await login(credentials);
    if (success) {
      window.location.href = '/';
    }
  };

  return (
    <LoginForm
      onLogin={handleLogin}
      loading={loading}
      error={error}
    />
  );
};

const AppRoutes: React.FC = () => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<AuthenticatedLoginForm />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          <ProtectedRoute permission="view_dashboard">
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/employees"
        element={
          <ProtectedRoute permission="manage_employees">
            <Employees />
          </ProtectedRoute>
        }
      />
      <Route
        path="/employees/add"
        element={
          <ProtectedRoute permission="manage_employees">
            <AddEmployeePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/employees/edit/:employeeId"
        element={
          <ProtectedRoute permission="manage_employees">
            <AddEmployeePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/employees/view/:employeeId"
        element={
          <ProtectedRoute permission="manage_employees">
            <AddEmployeePage />
          </ProtectedRoute>
        }
      />
      {/* === ATTENDANCE UPLOAD ROUTE === */}
      <Route
      path="/attendance"
      element={<AttendanceUpload />}
/>

      {/* === END ATTENDANCE UPLOAD ROUTE === */}
      <Route
        path="/payroll"
        element={
          <ProtectedRoute permission="manage_payroll">
            <PayrollReports />
          </ProtectedRoute>
        }
      />
      <Route
        path="/employee/:employeeId"
        element={
          <ProtectedRoute permission="manage_payroll">
            <EmployeePayrollDetails />
          </ProtectedRoute>
        }
      />
      <Route
        path="/holidays"
        element={
          <ProtectedRoute permission="manage_holidays">
            <Holidays />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
          <MasterDataProvider>
            <Router>
              <div className="min-h-screen bg-gray-50">
                <AppRoutes />
                <GlobalMasterData />
                <ToastContainer />
              </div>
            </Router>
          </MasterDataProvider>
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;
