import React from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { ViewProvider } from './contexts/ViewContext';
import { DataProvider } from './contexts/DataContext';
import AppShell from './components/layout/AppShell';
import ErrorBoundary from './components/common/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ViewProvider>
          <DataProvider>
            <AppShell />
          </DataProvider>
        </ViewProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
