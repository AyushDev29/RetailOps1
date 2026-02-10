import { useState, useEffect, useMemo } from 'react';
import { 
  getOrdersForRevenue, 
  getProductsMap,
  getRevenueSummary,
  getMonthlyRevenueComparison,
  getRevenueByCategory,
  getTopSellingProduct,
  getRevenueTrend,
  getRevenueAnomalies,
  getProductPerformanceOverTime
} from '../services/ownerAnalyticsService';

/**
 * Custom hook for owner revenue analytics
 * Fetches data once, calculates revenue metrics using service functions
 * OWNER ONLY - Contains price/revenue data
 */
export const useOwnerAnalytics = (filters = {}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rawData, setRawData] = useState({ orders: [], productsMap: {} });

  useEffect(() => {
    fetchOwnerAnalytics();
  }, []);

  const fetchOwnerAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch orders and products from Firestore (only once)
      const [orders, productsMap] = await Promise.all([
        getOrdersForRevenue(),
        getProductsMap()
      ]);

      setRawData({ orders, productsMap });
    } catch (err) {
      console.error('Error fetching owner analytics:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Memoize all calculations to avoid recomputation on re-renders
  const analytics = useMemo(() => {
    let { orders, productsMap } = rawData;

    if (!orders.length) {
      return {
        overallRevenue: 0,
        dailySalesRevenue: 0,
        exhibitionSalesRevenue: 0,
        monthlyComparison: { current: 0, previous: 0 },
        topSellingProduct: { name: 'N/A', category: 'N/A', revenue: 0 },
        categoryRevenue: [],
        revenueTrend: [],
        anomalies: [],
        productPerformance: { labels: [], series: [] }
      };
    }

    // Apply filters
    orders = applyFilters(orders, filters);

    const revenueSummary = getRevenueSummary(orders);
    const monthlyComparison = getMonthlyRevenueComparison(orders);
    const categoryRevenue = getRevenueByCategory(orders, productsMap);
    const topSellingProduct = getTopSellingProduct(orders, productsMap);
    const revenueTrend = getRevenueTrend(orders);
    const anomalies = getRevenueAnomalies(revenueTrend);
    const productPerformance = getProductPerformanceOverTime(orders, productsMap);

    return {
      overallRevenue: revenueSummary.overallRevenue,
      dailySalesRevenue: revenueSummary.dailySalesRevenue,
      exhibitionSalesRevenue: revenueSummary.exhibitionSalesRevenue,
      monthlyComparison,
      topSellingProduct,
      categoryRevenue,
      revenueTrend,
      anomalies,
      productPerformance
    };
  }, [rawData, filters]);

  return { analytics, loading, error, refetch: fetchOwnerAnalytics };
};

// Helper function to apply filters
const applyFilters = (orders, filters) => {
  let filtered = [...orders];

  // Filter by order type
  if (filters.orderType && filters.orderType !== 'all') {
    filtered = filtered.filter(order => order.type === filters.orderType);
  }

  // Filter by date range
  if (filters.dateRange && filters.dateRange !== 'all') {
    const now = new Date();
    let startDate, endDate;

    switch (filters.dateRange) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        endDate = now;
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = now;
        break;
      case 'custom':
        if (filters.startDate) {
          startDate = new Date(filters.startDate);
        }
        if (filters.endDate) {
          endDate = new Date(filters.endDate);
          endDate.setHours(23, 59, 59);
        }
        break;
    }

    if (startDate || endDate) {
      filtered = filtered.filter(order => {
        if (!order.createdAt) return false;
        const orderDate = order.createdAt.toDate();
        if (startDate && orderDate < startDate) return false;
        if (endDate && orderDate > endDate) return false;
        return true;
      });
    }
  }

  return filtered;
};
