import React, { createContext, useState, useContext, useCallback, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';

const ViewContext = createContext();

// View definitions
export const VIEWS = {
  // Auth views
  LOGIN: 'login',
  REGISTER: 'register',
  
  // Employee views
  EMPLOYEE_DASHBOARD: 'employee-dashboard',
  EMPLOYEE_ANALYTICS: 'employee-analytics',
  
  // Owner views
  OWNER_DASHBOARD: 'owner-dashboard',
  OWNER_ANALYTICS: 'owner-analytics',
  OWNER_USERS: 'owner-users',
  
  // Test views
  TEST_BILL: 'test-bill'
};

// Role-based view access
const VIEW_ACCESS = {
  [VIEWS.LOGIN]: ['guest'],
  [VIEWS.REGISTER]: ['guest'],
  [VIEWS.EMPLOYEE_DASHBOARD]: ['employee'],
  [VIEWS.EMPLOYEE_ANALYTICS]: ['employee'],
  [VIEWS.OWNER_DASHBOARD]: ['owner'],
  [VIEWS.OWNER_ANALYTICS]: ['owner'],
  [VIEWS.OWNER_USERS]: ['owner'],
  [VIEWS.TEST_BILL]: ['owner', 'employee']
};

// Default views per role
const DEFAULT_VIEWS = {
  owner: VIEWS.OWNER_DASHBOARD,
  employee: VIEWS.EMPLOYEE_DASHBOARD,
  guest: VIEWS.LOGIN
};

export function ViewProvider({ children }) {
  const { userProfile, user } = useAuth();
  const [currentView, setCurrentView] = useState(VIEWS.LOGIN);
  const [viewHistory, setViewHistory] = useState([VIEWS.LOGIN]);

  // Get current user role
  const userRole = useMemo(() => {
    if (!user) return 'guest';
    return userProfile?.role || 'guest';
  }, [user, userProfile]);

  // Check if user can access a view
  const canAccessView = useCallback((view) => {
    const allowedRoles = VIEW_ACCESS[view] || [];
    return allowedRoles.includes(userRole);
  }, [userRole]);

  // Navigate to a view with role-based safety
  const navigateToView = useCallback((view, options = {}) => {
    const { skipHistory = false, replace = false } = options;

    // Allow navigation to auth views (LOGIN/REGISTER) without access check
    // This handles logout scenarios where user role hasn't updated yet
    const isAuthView = view === VIEWS.LOGIN || view === VIEWS.REGISTER;
    
    // Check access for non-auth views
    if (!isAuthView && !canAccessView(view)) {
      console.warn(`Access denied to view: ${view}. Redirecting to default.`);
      const defaultView = DEFAULT_VIEWS[userRole];
      setCurrentView(defaultView);
      if (!skipHistory) {
        setViewHistory(prev => replace ? [...prev.slice(0, -1), defaultView] : [...prev, defaultView]);
      }
      return;
    }

    // Update current view
    setCurrentView(view);

    // Update history
    if (!skipHistory) {
      setViewHistory(prev => {
        if (replace) {
          return [...prev.slice(0, -1), view];
        }
        return [...prev, view];
      });
    }
  }, [canAccessView, userRole]);

  // Navigate back
  const goBack = useCallback(() => {
    if (viewHistory.length > 1) {
      const newHistory = viewHistory.slice(0, -1);
      const previousView = newHistory[newHistory.length - 1];
      setViewHistory(newHistory);
      setCurrentView(previousView);
    }
  }, [viewHistory]);

  // Navigate to default view for current role
  const navigateToDefault = useCallback(() => {
    const defaultView = DEFAULT_VIEWS[userRole];
    navigateToView(defaultView, { replace: true });
  }, [userRole, navigateToView]);

  // Auto-navigate to default view when role changes
  React.useEffect(() => {
    if (userRole !== 'guest') {
      const defaultView = DEFAULT_VIEWS[userRole];
      if (currentView === VIEWS.LOGIN || currentView === VIEWS.REGISTER) {
        navigateToView(defaultView, { replace: true });
      }
    }
  }, [userRole, currentView, navigateToView]);

  const value = useMemo(() => ({
    currentView,
    viewHistory,
    userRole,
    navigateToView,
    goBack,
    navigateToDefault,
    canAccessView,
    VIEWS
  }), [currentView, viewHistory, userRole, navigateToView, goBack, navigateToDefault, canAccessView]);

  return (
    <ViewContext.Provider value={value}>
      {children}
    </ViewContext.Provider>
  );
}

export function useView() {
  const context = useContext(ViewContext);
  if (!context) {
    throw new Error('useView must be used within ViewProvider');
  }
  return context;
}
