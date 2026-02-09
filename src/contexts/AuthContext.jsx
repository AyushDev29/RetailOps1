import React, { createContext, useState, useEffect } from 'react';
import { subscribeToAuthChanges, getUserProfile, login as loginService, logout as logoutService } from '../services/authService';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges(async (firebaseUser) => {
      if (firebaseUser) {
        // User is logged in, fetch their profile
        try {
          const profile = await getUserProfile(firebaseUser.uid);
          setUser(firebaseUser);
          setUserProfile(profile);
        } catch (err) {
          console.error('Error loading user profile:', err);
          setError('Failed to load user profile');
        }
      } else {
        // User is logged out
        setUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email, password) => {
    try {
      setError(null);
      setLoading(true);
      await loginService(email, password);
      // User state will be updated by onAuthStateChanged
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setError(null);
      await logoutService();
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const value = {
    user,
    userProfile,
    loading,
    error,
    login,
    logout,
    isOwner: userProfile?.role === 'owner',
    isEmployee: userProfile?.role === 'employee'
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
