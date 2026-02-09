import { useState, useEffect } from 'react';
import { getOrdersForRevenue, getProductsMap } from '../services/ownerAnalyticsService';

/**
 * Custom hook for owner revenue analytics
 * Fetches data once, calculates revenue metrics
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
    anomalies: []
  });

  useEffect(() => {
    fetchOwnerAnalytics();
  }, []);

  const fetchOwnerAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch orders and products
      const [orders, productsMap] = await Promise.all([
        getOrdersForRevenue(),
        getProductsMap()
      ]);

      // Calculate date ranges (IST)
      const now = new Date();
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

      // 1. Overall Revenue (all completed sales)
      const overallRevenue = orders.reduce((sum, order) => {
        return sum + (order.price * order.quantity);
      }, 0);

      // 2. Daily Sales Revenue (type = 'daily')
      const dailySalesRevenue = orders
        .filter(order => order.type === 'daily')
        .reduce((sum, order) => sum + (order.price * order.quantity), 0);

      // 3. Exhibition Sales Revenue (type = 'exhibition')
      const exhibitionSalesRevenue = orders
        .filter(order => order.type === 'exhibition')
        .reduce((sum, order) => sum + (order.price * order.quantity), 0);

      // 4. Monthly Revenue Comparison
      const currentMonthOrders = orders.filter(order => {
        if (!order.createdAt) return false;
        const orderDate = order.createdAt.toDate();
        return orderDate >= currentMonthStart && orderDate <= currentMonthEnd;
      });

      const previousMonthOrders = orders.filter(order => {
        if (!order.createdAt) return false;
        const orderDate = order.createdAt.toDate();
        return orderDate >= previousMonthStart && orderDate <= previousMonthEnd;
      });

      const currentMonthRevenue = currentMonthOrders.reduce((sum, order) => {
        return sum + (order.price * order.quantity);
      }, 0);

      const previousMonthRevenue = previousMonthOrders.reduce((sum, order) => {
        return sum + (order.price * order.quantity);
      }, 0);

      const monthlyComparison = {
        current: currentMonthRevenue,
        previous: previousMonthRevenue
      };

      // 5. Top Selling Product by Revenue
      const productRevenue = {};
      orders.forEach(order => {
        const revenue = order.price * order.quantity;
        if (!productRevenue[order.productId]) {
          productRevenue[order.productId] = 0;
        }
        productRevenue[order.productId] += revenue;
      });

      let topProductId = null;
      let topRevenue = 0;
      Object.entries(productRevenue).forEach(([productId, revenue]) => {
        if (revenue > topRevenue) {
          topRevenue = revenue;
          topProductId = productId;
        }
      });

      const topSellingProduct = topProductId && productsMap[topProductId] ? {
        name: productsMap[topProductId].name,
        category: productsMap[topProductId].category,
        revenue: topRevenue
      } : { name: 'N/A', category: 'N/A', revenue: 0 };

      // 6. Category-wise Revenue Breakdown
      const categoryRevenue = {};
      orders.forEach(order => {
        const product = productsMap[order.productId];
        if (product) {
          const category = product.category;
          const revenue = order.price * order.quantity;
          if (!categoryRevenue[category]) {
            categoryRevenue[category] = 0;
          }
          categoryRevenue[category] += revenue;
        }
      });

      const categoryRevenueArray = Object.entries(categoryRevenue)
        .map(([category, revenue]) => ({ category, revenue }))
        .sort((a, b) => b.revenue - a.revenue);

      // 7. Revenue Trend (last 30 days)
      const last30Days = [];
      for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        last30Days.push(date);
      }

      const revenueTrend = last30Days.map(date => {
        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);
        
        const dayRevenue = orders
          .filter(order => {
            if (!order.createdAt) return false;
            const orderDate = order.createdAt.toDate();
            return orderDate >= date && orderDate < nextDate;
          })
          .reduce((sum, order) => sum + (order.price * order.quantity), 0);

        return {
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          revenue: dayRevenue
        };
      });

      // 8. Anomaly Detection (simple statistical approach)
      const revenues = revenueTrend.map(d => d.revenue);
      const avgRevenue = revenues.reduce((sum, r) => sum + r, 0) / revenues.length;
      const stdDev = Math.sqrt(
        revenues.reduce((sum, r) => sum + Math.pow(r - avgRevenue, 2), 0) / revenues.length
      );

      const anomalies = revenueTrend
        .map((day, index) => {
          const deviation = Math.abs(day.revenue - avgRevenue);
          if (deviation > stdDev * 2) {
            return {
              date: day.date,
              revenue: day.revenue,
              type: day.revenue > avgRevenue ? 'spike' : 'drop',
              index
            };
          }
          return null;
        })
        .filter(a => a !== null);

      setAnalytics({
        overallRevenue,
        dailySalesRevenue,
        exhibitionSalesRevenue,
        monthlyComparison,
        topSellingProduct,
        categoryRevenue: categoryRevenueArray,
        revenueTrend,
        anomalies
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
