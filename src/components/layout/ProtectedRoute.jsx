import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

function ProtectedRoute({ children, requiredRole }) {
  const { user, userProfile, loading } = useAuth();

  // Show loading while checking auth state
  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  // Not authenticated - redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Authenticated but profile not loaded yet
  if (!userProfile) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading profile...</p>
      </div>
    );
  }

  // Check if user is active
  if (!userProfile.isActive) {
    return (
      <div className="loading-container">
        <p>Your account is inactive. Contact administrator.</p>
      </div>
    );
  }

  // Check role-based access
  if (requiredRole) {
    // If specific role required and user doesn't have it
    if (userProfile.role !== requiredRole) {
      // Owner can access everything, so only redirect if not owner
      if (requiredRole === 'owner' && userProfile.role === 'employee') {
        // Employee trying to access owner route - redirect to employee dashboard
        return <Navigate to="/employee" replace />;
      }
      
      // If employee route required but user is owner, allow access (owner can see everything)
      if (requiredRole === 'employee' && userProfile.role === 'owner') {
        return children;
      }
      
      // Default: redirect to appropriate dashboard
      if (userProfile.role === 'owner') {
        return <Navigate to="/owner" replace />;
      } else {
        return <Navigate to="/employee" replace />;
      }
    }
  }

  // All checks passed - render the protected content
  return children;
}

export default ProtectedRoute;
