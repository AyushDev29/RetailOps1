import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';
import EmployeeDashboard from '../pages/dashboard/EmployeeDashboard';
import DailySales from '../pages/dashboard/DailySales';
import PreBooking from '../pages/dashboard/PreBooking';
import Exhibition from '../pages/dashboard/Exhibition';
import EmployeeAnalytics from '../pages/analytics/EmployeeAnalytics';
import OwnerDashboard from '../pages/owner/OwnerDashboard';
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
        path="/employee/daily-sales" 
        element={
          <ProtectedRoute requiredRole="employee">
            <DailySales />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/employee/pre-booking" 
        element={
          <ProtectedRoute requiredRole="employee">
            <PreBooking />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/employee/exhibition" 
        element={
          <ProtectedRoute requiredRole="employee">
            <Exhibition />
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

      {/* Owner Routes - Owner can access everything */}
      <Route 
        path="/owner" 
        element={
          <ProtectedRoute requiredRole="owner">
            <OwnerDashboard />
          </ProtectedRoute>
        } 
      />

      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      
      {/* Catch all - redirect to login */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default AppRoutes;
