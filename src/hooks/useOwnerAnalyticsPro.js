import { useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  getDocs,
  query,
  where
} from 'firebase/firestore';
import { db } from '../services/firebase';

export const useOwnerAnalyticsPro = (filters) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rawData, setRawData] = useState({
    orders: [],
    products: [],
    users: []
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [ordersSnap, productsSnap, usersSnap] = await Promise.all([
        getDocs(collection(db, 'orders')),
        getDocs(collection(db, 'products')),
        getDocs(collection(db, 'users'))
      ]);

      const orders = ordersSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      const products = productsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      const users = usersSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setRawData({ orders, products, users });
    } catch (err) {
      console.error('Error fetching analytics data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const analytics = useMemo(() => {
    return calculateAnalytics(rawData, filters);
  }, [rawData, filters]);

  const employees = useMemo(() => {
    return rawData.users
      .filter(u => u.role === 'employee')
      .map(u => ({ id: u.id, name: u.name || u.email }));
  }, [rawData.users]);

  const categories = useMemo(() => {
    return [...new Set(rawData.products.map(p => p.category))];
  }, [rawData.products]);

  return { analytics, loading, error, employees, categories, refetch: fetchData };
};

const calculateAnalytics = (rawData, filters) => {
  let { orders, products, users } = rawData;

  // Filter completed orders only
  orders = orders.filter(o => o.status === 'completed');

  // Apply filters
  orders = applyFilters(orders, filters, products);

  // Get previous period orders for comparison
  const previousOrders = getPreviousPeriodOrders(rawData.orders, filters);

  // Calculate revenue for each order
  orders = orders.map(order => ({
    ...order,
    revenue: calculateOrderRevenue(order)
  }));

  previousOrders.forEach(order => {
    order.revenue = calculateOrderRevenue(order);
  });

  // Current period metrics
  const totalRevenue = orders.reduce((sum, o) => sum + o.revenue, 0);
  const totalOrders = orders.length;
  const totalItemsSold = orders.reduce((sum, o) => {
    if (o.items && Array.isArray(o.items)) {
      return sum + o.items.reduce((s, item) => s + item.quantity, 0);
    }
    return sum + (o.quantity || 0);
  }, 0);
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Previous period metrics
  const prevRevenue = previousOrders.reduce((sum, o) => sum + o.revenue, 0);
  const prevOrders = previousOrders.length;
  const prevItems = previousOrders.reduce((sum, o) => {
    if (o.items && Array.isArray(o.items)) {
      return sum + o.items.reduce((s, item) => s + item.quantity, 0);
    }
    return sum + (o.quantity || 0);
  }, 0);
  const prevAov = prevOrders > 0 ? prevRevenue / prevOrders : 0;

  // Growth calculations
  const revenueGrowth = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;
  const ordersGrowth = prevOrders > 0 ? ((totalOrders - prevOrders) / prevOrders) * 100 : 0;
  const itemsGrowth = prevItems > 0 ? ((totalItemsSold - prevItems) / prevItems) * 100 : 0;
  const aovGrowth = prevAov > 0 ? ((avgOrderValue - prevAov) / prevAov) * 100 : 0;

  // Revenue trend
  const revenueTrend = calculateRevenueTrend(orders, filters);
  const maxRevenue = Math.max(...revenueTrend.map(d => d.revenue), 1);

  // Top products
  const topProducts = calculateTopProducts(orders, products);

  // Category performance
  const categoryPerformance = calculateCategoryPerformance(orders, previousOrders, products);

  // Employee performance
  const employeePerformance = calculateEmployeePerformance(orders, users);

  // Low stock products
  const lowStockProducts = products
    .filter(p => p.stockQty <= p.lowStockThreshold)
    .sort((a, b) => a.stockQty - b.stockQty)
    .slice(0, 10);

  // Business insights
  const insights = generateInsights({
    revenueGrowth,
    ordersGrowth,
    aovGrowth,
    topProducts,
    categoryPerformance,
    lowStockProducts
  });

  return {
    totalRevenue,
    totalOrders,
    totalItemsSold,
    avgOrderValue,
    revenueGrowth,
    ordersGrowth,
    itemsGrowth,
    aovGrowth,
    revenueTrend,
    maxRevenue,
    topProducts,
    categoryPerformance,
    employeePerformance,
    lowStockProducts,
    insights
  };
};

const calculateOrderRevenue = (order) => {
  if (order.totals && order.totals.payableAmount) {
    return order.totals.payableAmount;
  }
  if (order.price && order.quantity) {
    return order.price * order.quantity;
  }
  return 0;
};

const applyFilters = (orders, filters, products) => {
  let filtered = [...orders];

  // Date range filter
  if (filters.dateRange && filters.dateRange !== 'all') {
    const { startDate, endDate } = getDateRange(filters);
    filtered = filtered.filter(o => {
      if (!o.createdAt) return false;
      const date = o.createdAt.toDate();
      return date >= startDate && date <= endDate;
    });
  }

  // Order type filter
  if (filters.orderType && filters.orderType !== 'all') {
    filtered = filtered.filter(o => o.type === filters.orderType);
  }

  // Category filter
  if (filters.category && filters.category !== 'all') {
    filtered = filtered.filter(o => {
      if (o.items && Array.isArray(o.items)) {
        return o.items.some(item => {
          const product = products.find(p => p.id === item.productId);
          return product && product.category === filters.category;
        });
      }
      const product = products.find(p => p.id === o.productId);
      return product && product.category === filters.category;
    });
  }

  // Employee filter
  if (filters.employee && filters.employee !== 'all') {
    filtered = filtered.filter(o => o.createdBy === filters.employee);
  }

  return filtered;
};

const getDateRange = (filters) => {
  const now = new Date();
  let startDate, endDate = new Date(now);

  switch (filters.dateRange) {
    case 'today':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'quarter':
      const quarter = Math.floor(now.getMonth() / 3);
      startDate = new Date(now.getFullYear(), quarter * 3, 1);
      break;
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    case 'custom':
      startDate = filters.startDate ? new Date(filters.startDate) : new Date(0);
      endDate = filters.endDate ? new Date(filters.endDate) : now;
      endDate.setHours(23, 59, 59);
      break;
    default:
      startDate = new Date(0);
  }

  return { startDate, endDate };
};

const getPreviousPeriodOrders = (allOrders, filters) => {
  const { startDate, endDate } = getDateRange(filters);
  const duration = endDate - startDate;
  const prevStart = new Date(startDate.getTime() - duration);
  const prevEnd = new Date(startDate.getTime() - 1);

  return allOrders
    .filter(o => o.status === 'completed' && o.createdAt)
    .filter(o => {
      const date = o.createdAt.toDate();
      return date >= prevStart && date <= prevEnd;
    });
};

const calculateRevenueTrend = (orders, filters) => {
  const { startDate, endDate } = getDateRange(filters);
  const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
  const trend = [];

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
    const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);
    
    const dayOrders = orders.filter(o => {
      if (!o.createdAt) return false;
      const orderDate = o.createdAt.toDate();
      return orderDate >= date && orderDate < nextDate;
    });

    const revenue = dayOrders.reduce((sum, o) => sum + o.revenue, 0);
    const orderCount = dayOrders.length;

    trend.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      revenue,
      orders: orderCount
    });
  }

  return trend;
};

const calculateTopProducts = (orders, products) => {
  const productRevenue = {};

  orders.forEach(order => {
    if (order.items && Array.isArray(order.items)) {
      order.items.forEach(item => {
        if (!productRevenue[item.productId]) {
          productRevenue[item.productId] = 0;
        }
        productRevenue[item.productId] += item.lineTotal || (item.unitPrice * item.quantity);
      });
    } else if (order.productId) {
      if (!productRevenue[order.productId]) {
        productRevenue[order.productId] = 0;
      }
      productRevenue[order.productId] += order.revenue;
    }
  });

  return Object.entries(productRevenue)
    .map(([productId, revenue]) => {
      const product = products.find(p => p.id === productId);
      return {
        id: productId,
        name: product?.name || 'Unknown',
        revenue
      };
    })
    .sort((a, b) => b.revenue - a.revenue);
};

const calculateCategoryPerformance = (orders, previousOrders, products) => {
  const categories = {};
  const prevCategories = {};

  // Current period
  orders.forEach(order => {
    if (order.items && Array.isArray(order.items)) {
      order.items.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        if (product) {
          if (!categories[product.category]) {
            categories[product.category] = { revenue: 0, orders: 0 };
          }
          categories[product.category].revenue += item.lineTotal || (item.unitPrice * item.quantity);
          categories[product.category].orders += 1;
        }
      });
    } else if (order.productId) {
      const product = products.find(p => p.id === order.productId);
      if (product) {
        if (!categories[product.category]) {
          categories[product.category] = { revenue: 0, orders: 0 };
        }
        categories[product.category].revenue += order.revenue;
        categories[product.category].orders += 1;
      }
    }
  });

  // Previous period
  previousOrders.forEach(order => {
    if (order.items && Array.isArray(order.items)) {
      order.items.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        if (product) {
          if (!prevCategories[product.category]) {
            prevCategories[product.category] = { revenue: 0 };
          }
          prevCategories[product.category].revenue += item.lineTotal || (item.unitPrice * item.quantity);
        }
      });
    } else if (order.productId) {
      const product = products.find(p => p.id === order.productId);
      if (product) {
        if (!prevCategories[product.category]) {
          prevCategories[product.category] = { revenue: 0 };
        }
        prevCategories[product.category].revenue += order.revenue;
      }
    }
  });

  return Object.entries(categories).map(([category, data]) => {
    const prevRevenue = prevCategories[category]?.revenue || 0;
    const growth = prevRevenue > 0 ? ((data.revenue - prevRevenue) / prevRevenue) * 100 : 0;
    const avgValue = data.orders > 0 ? data.revenue / data.orders : 0;

    return {
      category,
      revenue: data.revenue,
      orders: data.orders,
      avgValue,
      growth
    };
  }).sort((a, b) => b.revenue - a.revenue);
};

const calculateEmployeePerformance = (orders, users) => {
  const empPerformance = {};

  orders.forEach(order => {
    if (!empPerformance[order.createdBy]) {
      empPerformance[order.createdBy] = {
        revenue: 0,
        orders: 0
      };
    }
    empPerformance[order.createdBy].revenue += order.revenue;
    empPerformance[order.createdBy].orders += 1;
  });

  return Object.entries(empPerformance)
    .map(([userId, data]) => {
      const user = users.find(u => u.id === userId);
      return {
        id: userId,
        name: user?.name || user?.email || 'Unknown',
        revenue: data.revenue,
        orders: data.orders,
        avgOrder: data.orders > 0 ? data.revenue / data.orders : 0
      };
    })
    .sort((a, b) => b.revenue - a.revenue);
};

const generateInsights = (data) => {
  const insights = [];

  // Revenue growth insight
  if (data.revenueGrowth > 20) {
    insights.push({
      type: 'success',
      icon: '📈',
      title: 'Strong Revenue Growth',
      message: `Revenue is up ${data.revenueGrowth.toFixed(1)}% compared to previous period. Excellent performance!`
    });
  } else if (data.revenueGrowth < -10) {
    insights.push({
      type: 'warning',
      icon: '📉',
      title: 'Revenue Decline',
      message: `Revenue is down ${Math.abs(data.revenueGrowth).toFixed(1)}%. Consider promotional campaigns or inventory review.`,
      action: 'View Recommendations'
    });
  }

  // AOV insight
  if (data.aovGrowth > 15) {
    insights.push({
      type: 'success',
      icon: '💰',
      title: 'Increased Order Value',
      message: `Average order value increased by ${data.aovGrowth.toFixed(1)}%. Customers are buying more per transaction.`
    });
  }

  // Top product insight
  if (data.topProducts && data.topProducts.length > 0) {
    const topProduct = data.topProducts[0];
    const topRevenue = topProduct.revenue;
    const totalRevenue = data.topProducts.reduce((sum, p) => sum + p.revenue, 0);
    const percentage = (topRevenue / totalRevenue) * 100;
    
    if (percentage > 40) {
      insights.push({
        type: 'info',
        icon: '⭐',
        title: 'Product Concentration Risk',
        message: `${topProduct.name} accounts for ${percentage.toFixed(0)}% of revenue. Consider diversifying product mix.`
      });
    }
  }

  // Low stock insight
  if (data.lowStockProducts && data.lowStockProducts.length > 0) {
    const outOfStock = data.lowStockProducts.filter(p => p.stockQty === 0).length;
    if (outOfStock > 0) {
      insights.push({
        type: 'alert',
        icon: '⚠️',
        title: 'Stock Alert',
        message: `${outOfStock} products are out of stock. ${data.lowStockProducts.length} products need restocking.`,
        action: 'View Products'
      });
    }
  }

  // Category performance insight
  if (data.categoryPerformance && data.categoryPerformance.length > 0) {
    const bestCategory = data.categoryPerformance[0];
    if (bestCategory.growth > 30) {
      insights.push({
        type: 'success',
        icon: '🎯',
        title: 'Category Winner',
        message: `${bestCategory.category.charAt(0).toUpperCase() + bestCategory.category.slice(1)} category is growing ${bestCategory.growth.toFixed(0)}%. Focus on expanding this category.`
      });
    }
  }

  return insights;
};
