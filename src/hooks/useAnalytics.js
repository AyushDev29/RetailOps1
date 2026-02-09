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
    peakSalesAgeGroup: { '18-25': 0, '26-35': 0, '36-45': 0, '45+': 0 }
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

      // Fetch all orders (no filters, we'll filter in memory)
      const allOrders = await getOrdersForAnalytics({});

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

    // Calculate date ranges based on period filter
    const now = new Date();
    let startDate, endDate, previousStartDate, previousEndDate;

    if (period === 'daily') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      previousStartDate = new Date(startDate);
      previousStartDate.setDate(previousStartDate.getDate() - 1);
      previousEndDate = new Date(endDate);
      previousEndDate.setDate(previousEndDate.getDate() - 1);
    } else if (period === 'weekly') {
      const dayOfWeek = now.getDay();
      startDate = new Date(now);
      startDate.setDate(now.getDate() - dayOfWeek);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);
      previousStartDate = new Date(startDate);
      previousStartDate.setDate(previousStartDate.getDate() - 7);
      previousEndDate = new Date(startDate);
      previousEndDate.setDate(previousEndDate.getDate() - 1);
    } else {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      previousStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      previousEndDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
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
    const ageGroupMap = { '18-25': 0, '26-35': 0, '36-45': 0, '45+': 0 };
    filteredOrders.forEach(order => {
      const customer = customersMap[order.customerPhone];
      if (customer && customer.ageGroup) {
        const ag = customer.ageGroup;
        if (ag === '0-12' || ag === '13-19' || ag === '20-35') {
          ageGroupMap['18-25'] = (ageGroupMap['18-25'] || 0) + 1;
        } else if (ag === '36-50') {
          ageGroupMap['36-45'] = (ageGroupMap['36-45'] || 0) + 1;
        } else if (ag === '51+') {
          ageGroupMap['45+'] = (ageGroupMap['45+'] || 0) + 1;
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
