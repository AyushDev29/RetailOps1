import React, { createContext } from 'react';
import { useAuth } from '../hooks/useAuth';

export const UserContext = createContext();

export function UserProvider({ children }) {
  const { userProfile } = useAuth();

  const value = {
    userRole: userProfile?.role || null,
    userName: userProfile?.name || '',
    userEmail: userProfile?.email || '',
    isActive: userProfile?.isActive || false
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}
