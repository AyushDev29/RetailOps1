import { useState, useEffect } from 'react';
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
  const [analytics, setAnalytics] = useState({
    overallRevenue: 0,
    dailySalesRevenue: 0,
    exhibitionSalesRevenue: 0,
    monthlyComparison: { current: 0, previous: 0 },
    topSellingProduct: { name: '', category: '', revenue: 0 },
    categoryRevenue: [],
    revenueTrend: [],
    anomalies: [],
    productPerformance: { labels: [], series: [] }
  });

  useEffect(() => {
    fetchOwnerAnalytics();
  }, []);

  const fetchOwnerAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch orders and products from Firestore
      const [orders, productsMap] = await Promise.all([
        getOrdersForRevenue(),
        getProductsMap()
      ]);

      // Calculate all metrics using service functions
      const revenueSummary = getRevenueSummary(orders);
      const monthlyComparison = getMonthlyRevenueComparison(orders);
      const categoryRevenue = getRevenueByCategory(orders, productsMap);
      const topSellingProduct = getTopSellingProduct(orders, productsMap);
      const revenueTrend = getRevenueTrend(orders);
      const anomalies = getRevenueAnomalies(revenueTrend);
      const productPerformance = getProductPerformanceOverTime(orders, productsMap);

      setAnalytics({
        overallRevenue: revenueSummary.overallRevenue,
        dailySalesRevenue: revenueSummary.dailySalesRevenue,
        exhibitionSalesRevenue: revenueSummary.exhibitionSalesRevenue,
        monthlyComparison,
        topSellingProduct,
        categoryRevenue,
        revenueTrend,
        anomalies,
        productPerformance
      });
    } catch (err) {
      console.error('Error fetching owner analytics:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { analytics, loading, error, refetch: fetchOwnerAnalytics };
};
