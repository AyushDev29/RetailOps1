import { Routes, Route, Navigate } from 'react-router-dom';
import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';
import EmployeeDashboard from '../pages/dashboard/EmployeeDashboard';
import EmployeeAnalytics from '../pages/analytics/EmployeeAnalytics';
import OwnerDashboard from '../pages/owner/OwnerDashboard';
import OwnerAnalyticsPro from '../pages/owner/OwnerAnalyticsPro';
import UserManagement from '../pages/owner/UserManagement';
import BillPreviewTest from '../pages/test/BillPreviewTest';
import ProtectedRoute from '../components/layout/ProtectedRoute';

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Employee Routes */}
      <Route 
        path="/employee" 
        element={
          <ProtectedRoute requiredRole="employee">
            <EmployeeDashboard />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/employee/analytics" 
        element={
          <ProtectedRoute requiredRole="employee">
            <EmployeeAnalytics />
          </ProtectedRoute>
        } 
      />

      {/* Owner Routes */}
      <Route 
        path="/owner" 
        element={
          <ProtectedRoute requiredRole="owner">
            <OwnerDashboard />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/owner/dashboard" 
        element={
          <ProtectedRoute requiredRole="owner">
            <OwnerDashboard />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/owner/analytics" 
        element={
          <ProtectedRoute requiredRole="owner">
            <OwnerAnalyticsPro />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/owner/users" 
        element={
          <ProtectedRoute requiredRole="owner">
            <UserManagement />
          </ProtectedRoute>
        } 
      />

      {/* Test Routes (Development Only) */}
      <Route path="/test/bill-preview" element={<BillPreviewTest />} />

      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      
      {/* Catch all - redirect to login */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default AppRoutes;
