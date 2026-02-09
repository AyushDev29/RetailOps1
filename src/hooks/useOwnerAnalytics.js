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
export const useOwnerAnalytics = () => {
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
    const { orders, productsMap } = rawData;

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
  }, [rawData]);

  return { analytics, loading, error, refetch: fetchOwnerAnalytics };
};
