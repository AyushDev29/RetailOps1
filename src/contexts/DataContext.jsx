import React, { createContext, useState, useContext, useCallback, useMemo, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getAllProducts } from '../services/productService';
import { getAllOrders } from '../services/orderService';
import { getAllUsers } from '../services/authService';

const DataContext = createContext();

export function DataProvider({ children }) {
  const { user, userProfile } = useAuth();
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastFetch, setLastFetch] = useState({});

  // Fetch all data once after login
  const fetchAllData = useCallback(async (force = false) => {
    if (!user || !userProfile) return;
    
    // Don't refetch if data is fresh (< 5 minutes old) unless forced
    const now = Date.now();
    const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
    
    if (!force && lastFetch.timestamp && (now - lastFetch.timestamp) < CACHE_DURATION) {
      return;
    }

    try {
      setLoading(true);
      
      const promises = [];
      
      // Always fetch products
      promises.push(getAllProducts());
      
      // Fetch orders for both roles
      promises.push(getAllOrders());
      
      // Only fetch users for owner
      if (userProfile.role === 'owner') {
        promises.push(getAllUsers());
      }

      const results = await Promise.all(promises);
      
      setProducts(results[0] || []);
      setOrders(results[1] || []);
      if (userProfile.role === 'owner' && results[2]) {
        setUsers(results[2] || []);
      }
      
      setLastFetch({ timestamp: now });
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [user, userProfile, lastFetch]);

  // Fetch data on mount and when user changes
  useEffect(() => {
    if (user && userProfile) {
      fetchAllData();
    }
  }, [user, userProfile?.role]); // Only refetch when user or role changes

  // Refresh specific data
  const refreshProducts = useCallback(async () => {
    try {
      const data = await getAllProducts();
      setProducts(data);
    } catch (error) {
      console.error('Error refreshing products:', error);
    }
  }, []);

  const refreshOrders = useCallback(async () => {
    try {
      const data = await getAllOrders();
      setOrders(data);
    } catch (error) {
      console.error('Error refreshing orders:', error);
    }
  }, []);

  const refreshUsers = useCallback(async () => {
    if (userProfile?.role !== 'owner') return;
    try {
      const data = await getAllUsers();
      setUsers(data);
    } catch (error) {
      console.error('Error refreshing users:', error);
    }
  }, [userProfile]);

  // Update single product in cache
  const updateProductInCache = useCallback((productId, updates) => {
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, ...updates } : p));
  }, []);

  // Add product to cache
  const addProductToCache = useCallback((product) => {
    setProducts(prev => [...prev, product]);
  }, []);

  // Remove product from cache
  const removeProductFromCache = useCallback((productId) => {
    setProducts(prev => prev.filter(p => p.id !== productId));
  }, []);

  const value = useMemo(() => ({
    products,
    orders,
    users,
    loading,
    lastFetch,
    fetchAllData,
    refreshProducts,
    refreshOrders,
    refreshUsers,
    updateProductInCache,
    addProductToCache,
    removeProductFromCache
  }), [
    products,
    orders,
    users,
    loading,
    lastFetch,
    fetchAllData,
    refreshProducts,
    refreshOrders,
    refreshUsers,
    updateProductInCache,
    addProductToCache,
    removeProductFromCache
  ]);

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within DataProvider');
  }
  return context;
}
