import { useState, useEffect } from 'react';
import { getOrdersForAnalytics, getCustomersForAnalytics } from '../services/analyticsService';

/**
 * Custom hook for employee analytics
 * Fetches data once, filters in memory for instant updates
 * NO PRICE/REVENUE CALCULATIONS
 */
export const useAnalytics = (filters) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rawData, setRawData] = useState({ orders: [], customersMap: {} });
  const [analytics, setAnalytics] = useState({
    dailySalesComparison: { current: 0, previous: 0 },
    exhibitionSalesComparison: [],
    peakSalesTime: { hour: 0, count: 0 },
    peakSalesGender: { Male: 0, Female: 0, Other: 0 },
    peakSalesAgeGroup: { '0-12': 0, '13-19': 0, '20-35': 0, '36-50': 0, '51+': 0 }
  });

  // Fetch data only once on mount
  useEffect(() => {
    fetchRawData();
  }, []);

  // Recalculate analytics when filters change (no refetch)
  useEffect(() => {
    if (rawData.orders.length > 0) {
      calculateAnalytics();
    }
  }, [filters, rawData]);

  const fetchRawData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Determine if owner or employee
      const isOwner = !filters.employeeId || filters.isOwner;

      // Fetch orders based on role
      const allOrders = await getOrdersForAnalytics({ 
        employeeId: filters.employeeId,
        isOwner: isOwner
      });

      // Get customer data for gender/age analysis
      const customerPhones = [...new Set(allOrders.map(o => o.customerPhone))];
      const customersMap = await getCustomersForAnalytics(customerPhones);

      setRawData({ orders: allOrders, customersMap });
    } catch (err) {
      console.error('Error fetching analytics data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateAnalytics = () => {
    const { period, gender, ageGroup, exhibitionId, employeeId } = filters;
    const { orders, customersMap } = rawData;

    // Calculate date ranges based on period filter (IST timezone)
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
    const istNow = new Date(now.getTime() + istOffset);
    
    let startDate, endDate, previousStartDate, previousEndDate;

    if (period === 'daily') {
      // Today in IST
      startDate = new Date(Date.UTC(
        istNow.getUTCFullYear(),
        istNow.getUTCMonth(),
        istNow.getUTCDate(),
        0, 0, 0, 0
      ));
      startDate = new Date(startDate.getTime() - istOffset); // Convert to UTC
      
      endDate = new Date(Date.UTC(
        istNow.getUTCFullYear(),
        istNow.getUTCMonth(),
        istNow.getUTCDate(),
        23, 59, 59, 999
      ));
      endDate = new Date(endDate.getTime() - istOffset); // Convert to UTC
      
      // Yesterday in IST
      const yesterdayIST = new Date(istNow.getTime() - (24 * 60 * 60 * 1000));
      previousStartDate = new Date(Date.UTC(
        yesterdayIST.getUTCFullYear(),
        yesterdayIST.getUTCMonth(),
        yesterdayIST.getUTCDate(),
        0, 0, 0, 0
      ));
      previousStartDate = new Date(previousStartDate.getTime() - istOffset);
      
      previousEndDate = new Date(Date.UTC(
        yesterdayIST.getUTCFullYear(),
        yesterdayIST.getUTCMonth(),
        yesterdayIST.getUTCDate(),
        23, 59, 59, 999
      ));
      previousEndDate = new Date(previousEndDate.getTime() - istOffset);
      
    } else if (period === 'weekly') {
      const dayOfWeek = istNow.getUTCDay();
      
      // This week start (Sunday) in IST
      const weekStartIST = new Date(istNow.getTime() - (dayOfWeek * 24 * 60 * 60 * 1000));
      startDate = new Date(Date.UTC(
        weekStartIST.getUTCFullYear(),
        weekStartIST.getUTCMonth(),
        weekStartIST.getUTCDate(),
        0, 0, 0, 0
      ));
      startDate = new Date(startDate.getTime() - istOffset);
      
      endDate = new Date(Date.UTC(
        istNow.getUTCFullYear(),
        istNow.getUTCMonth(),
        istNow.getUTCDate(),
        23, 59, 59, 999
      ));
      endDate = new Date(endDate.getTime() - istOffset);
      
      // Last week
      previousStartDate = new Date(startDate.getTime() - (7 * 24 * 60 * 60 * 1000));
      previousEndDate = new Date(startDate.getTime() - 1);
      
    } else {
      // This month in IST
      startDate = new Date(Date.UTC(
        istNow.getUTCFullYear(),
        istNow.getUTCMonth(),
        1,
        0, 0, 0, 0
      ));
      startDate = new Date(startDate.getTime() - istOffset);
      
      const lastDayOfMonth = new Date(Date.UTC(
        istNow.getUTCFullYear(),
        istNow.getUTCMonth() + 1,
        0
      )).getUTCDate();
      
      endDate = new Date(Date.UTC(
        istNow.getUTCFullYear(),
        istNow.getUTCMonth(),
        lastDayOfMonth,
        23, 59, 59, 999
      ));
      endDate = new Date(endDate.getTime() - istOffset);
      
      // Last month
      previousStartDate = new Date(Date.UTC(
        istNow.getUTCFullYear(),
        istNow.getUTCMonth() - 1,
        1,
        0, 0, 0, 0
      ));
      previousStartDate = new Date(previousStartDate.getTime() - istOffset);
      
      const lastDayOfPrevMonth = new Date(Date.UTC(
        istNow.getUTCFullYear(),
        istNow.getUTCMonth(),
        0
      )).getUTCDate();
      
      previousEndDate = new Date(Date.UTC(
        istNow.getUTCFullYear(),
        istNow.getUTCMonth() - 1,
        lastDayOfPrevMonth,
        23, 59, 59, 999
      ));
      previousEndDate = new Date(previousEndDate.getTime() - istOffset);
    }

    // Filter current period orders
    const currentOrders = orders.filter(order => {
      if (!order.createdAt) return false;
      const orderDate = order.createdAt.toDate();
      if (orderDate < startDate || orderDate > endDate) return false;
      if (exhibitionId && order.exhibitionId !== exhibitionId) return false;
      if (employeeId && order.createdBy !== employeeId) return false;
      return true;
    });

    // Filter previous period orders
    const previousOrders = orders.filter(order => {
      if (!order.createdAt) return false;
      const orderDate = order.createdAt.toDate();
      if (orderDate < previousStartDate || orderDate > previousEndDate) return false;
      if (exhibitionId && order.exhibitionId !== exhibitionId) return false;
      if (employeeId && order.createdBy !== employeeId) return false;
      return true;
    });

    // Apply gender and age filters to current orders
    let filteredOrders = currentOrders.filter(order => {
      const customer = customersMap[order.customerPhone];
      if (!customer) return false;
      if (gender && customer.gender !== gender) return false;
      if (ageGroup && customer.ageGroup !== ageGroup) return false;
      return true;
    });

    // 1. Daily Sales Comparison (count only)
    const dailySalesComparison = {
      current: filteredOrders.length,
      previous: previousOrders.length
    };

    // 2. Exhibition Sales Comparison
    const exhibitionMap = {};
    filteredOrders.forEach(order => {
      if (order.exhibitionId) {
        exhibitionMap[order.exhibitionId] = (exhibitionMap[order.exhibitionId] || 0) + 1;
      }
    });
    const exhibitionSalesComparison = Object.entries(exhibitionMap).map(([id, count]) => ({
      exhibitionId: id,
      count
    }));

    // 3. Peak Sales Time (IST timezone, hour 0-23)
    const hourMap = {};
    filteredOrders.forEach(order => {
      if (order.createdAt && order.createdAt.toDate) {
        const date = order.createdAt.toDate();
        const istDate = new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
        const hour = istDate.getUTCHours();
        hourMap[hour] = (hourMap[hour] || 0) + 1;
      }
    });
    let peakHour = 0;
    let peakCount = 0;
    Object.entries(hourMap).forEach(([hour, count]) => {
      if (count > peakCount) {
        peakHour = parseInt(hour);
        peakCount = count;
      }
    });
    const peakSalesTime = { hour: peakHour, count: peakCount };

    // 4. Peak Sales Gender
    const genderMap = { Male: 0, Female: 0, Other: 0 };
    filteredOrders.forEach(order => {
      const customer = customersMap[order.customerPhone];
      if (customer && customer.gender) {
        genderMap[customer.gender] = (genderMap[customer.gender] || 0) + 1;
      }
    });
    const peakSalesGender = genderMap;

    // 5. Peak Sales Age Group
    const ageGroupMap = { '0-12': 0, '13-19': 0, '20-35': 0, '36-50': 0, '51+': 0 };
    filteredOrders.forEach(order => {
      const customer = customersMap[order.customerPhone];
      if (customer && customer.ageGroup) {
        const ag = customer.ageGroup;
        if (ageGroupMap.hasOwnProperty(ag)) {
          ageGroupMap[ag] = (ageGroupMap[ag] || 0) + 1;
        }
      }
    });
    const peakSalesAgeGroup = ageGroupMap;

    setAnalytics({
      dailySalesComparison,
      exhibitionSalesComparison,
      peakSalesTime,
      peakSalesGender,
      peakSalesAgeGroup
    });
  };

  return { analytics, loading, error, refetch: fetchRawData };
};
