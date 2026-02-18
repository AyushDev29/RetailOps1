import React, { Suspense, lazy, memo } from 'react';
import { useView } from '../../contexts/ViewContext';
import { useAuth } from '../../hooks/useAuth';
import LoadingSkeleton from '../common/LoadingSkeleton';
import './AppShell.css';

// Lazy load views for code splitting
const Login = lazy(() => import('../../pages/auth/Login'));
const Register = lazy(() => import('../../pages/auth/Register'));
const EmployeeDashboard = lazy(() => import('../../pages/dashboard/EmployeeDashboard'));
const EmployeeAnalytics = lazy(() => import('../../pages/analytics/EmployeeAnalytics'));
const OwnerDashboard = lazy(() => import('../../pages/owner/OwnerDashboard'));
const OwnerAnalyticsPro = lazy(() => import('../../pages/owner/OwnerAnalyticsPro'));
const UserManagement = lazy(() => import('../../pages/owner/UserManagement'));
const FixBills = lazy(() => import('../../pages/owner/FixBills'));
const BillPreviewTest = lazy(() => import('../../pages/test/BillPreviewTest'));

// View renderer with memoization
const ViewRenderer = memo(({ view }) => {
  const { VIEWS } = useView();

  switch (view) {
    case VIEWS.LOGIN:
      return <Login />;
    case VIEWS.REGISTER:
      return <Register />;
    case VIEWS.EMPLOYEE_DASHBOARD:
      return <EmployeeDashboard />;
    case VIEWS.EMPLOYEE_ANALYTICS:
      return <EmployeeAnalytics />;
    case VIEWS.OWNER_DASHBOARD:
      return <OwnerDashboard />;
    case VIEWS.OWNER_ANALYTICS:
      return <OwnerAnalyticsPro />;
    case VIEWS.OWNER_USERS:
      return <UserManagement />;
    case VIEWS.OWNER_FIX_BILLS:
      return <FixBills />;
    case VIEWS.TEST_BILL:
      return <BillPreviewTest />;
    default:
      return <Login />;
  }
});

ViewRenderer.displayName = 'ViewRenderer';

function AppShell() {
  const { currentView } = useView();
  const { loading: authLoading } = useAuth();

  // Show loading skeleton during initial auth check
  if (authLoading) {
    return (
      <div className="app-shell-loading">
        <LoadingSkeleton />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="app-shell-content">
        <Suspense fallback={<LoadingSkeleton />}>
          <div className="view-container">
            <ViewRenderer view={currentView} />
          </div>
        </Suspense>
      </div>
    </div>
  );
}

export default memo(AppShell);
