import { 
  collection, 
  getDocs
} from 'firebase/firestore';
import { db } from './firebase';

/**
 * Get orders with price data for revenue calculations (OWNER ONLY)
 * Includes: completed daily, exhibition, and converted pre-bookings
 * Excludes: pending pre-bookings
 * @returns {Array} Orders with price, quantity, type, status, createdAt, productId
 */
export const getOrdersForRevenue = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'orders'));
    
    let orders = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        type: data.type,
        status: data.status,
        price: data.price,
        quantity: data.quantity,
        productId: data.productId,
        createdAt: data.createdAt,
        exhibitionId: data.exhibitionId
      };
    });
    
    // Include only completed sales and converted pre-bookings
    orders = orders.filter(order => {
      // Exclude pending pre-bookings
      if (order.type === 'prebooking' && order.status === 'pending') {
        return false;
      }
      // Include completed sales
      if (order.status === 'completed' || order.status === 'prebooked') {
        return true;
      }
      return false;
    });
    
    return orders;
  } catch (error) {
    console.error('Error fetching orders for revenue:', error);
    throw error;
  }
};

/**
 * Get products for name/category lookup
 * @returns {Object} Map of productId -> {name, category}
 */
export const getProductsMap = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'products'));
    const productsMap = {};
    
    querySnapshot.docs.forEach(doc => {
      const data = doc.data();
      productsMap[doc.id] = {
        name: data.name,
        category: data.category
      };
    });
    
    return productsMap;
  } catch (error) {
    console.error('Error fetching products map:', error);
    throw error;
  }
};

/**
 * Get revenue summary (overall, daily, exhibition)
 * @param {Array} orders - Orders with price data
 * @returns {Object} Revenue summary
 */
export const getRevenueSummary = (orders) => {
  const overallRevenue = orders.reduce((sum, order) => {
    return sum + (order.price * order.quantity);
  }, 0);

  const dailySalesRevenue = orders
    .filter(order => order.type === 'daily')
    .reduce((sum, order) => sum + (order.price * order.quantity), 0);

  const exhibitionSalesRevenue = orders
    .filter(order => order.type === 'exhibition')
    .reduce((sum, order) => sum + (order.price * order.quantity), 0);

  return {
    overallRevenue,
    dailySalesRevenue,
    exhibitionSalesRevenue
  };
};

/**
 * Get monthly revenue comparison (current vs previous month, IST)
 * @param {Array} orders - Orders with price data
 * @returns {Object} Monthly comparison
 */
export const getMonthlyRevenueComparison = (orders) => {
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

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

  return {
    current: currentMonthRevenue,
    previous: previousMonthRevenue
  };
};

/**
 * Get revenue breakdown by category
 * @param {Array} orders - Orders with price data
 * @param {Object} productsMap - Product lookup map
 * @returns {Array} Category revenue array sorted descending
 */
export const getRevenueByCategory = (orders, productsMap) => {
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

  return Object.entries(categoryRevenue)
    .map(([category, revenue]) => ({ category, revenue }))
    .sort((a, b) => b.revenue - a.revenue);
};

/**
 * Get top selling product by revenue
 * @param {Array} orders - Orders with price data
 * @param {Object} productsMap - Product lookup map
 * @returns {Object} Top product with name, category, revenue
 */
export const getTopSellingProduct = (orders, productsMap) => {
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

  if (topProductId && productsMap[topProductId]) {
    return {
      name: productsMap[topProductId].name,
      category: productsMap[topProductId].category,
      revenue: topRevenue
    };
  }

  return { name: 'N/A', category: 'N/A', revenue: 0 };
};

/**
 * Get revenue trend for last 30 days
 * @param {Array} orders - Orders with price data
 * @returns {Array} Daily revenue data sorted chronologically
 */
export const getRevenueTrend = (orders) => {
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
      revenue: dayRevenue,
      timestamp: date.getTime()
    };
  });

  return revenueTrend.sort((a, b) => a.timestamp - b.timestamp);
};

/**
 * Detect revenue anomalies (spikes and drops)
 * Spike: revenue > 2× rolling 7-day average
 * Drop: revenue < 0.5× rolling 7-day average
 * @param {Array} revenueTrend - Daily revenue data
 * @returns {Array} Anomalies with date, type, value, baseline
 */
export const getRevenueAnomalies = (revenueTrend) => {
  if (revenueTrend.length < 7) {
    return [];
  }

  const anomalies = [];

  for (let i = 7; i < revenueTrend.length; i++) {
    // Calculate 7-day rolling average (previous 7 days)
    const last7Days = revenueTrend.slice(i - 7, i);
    const baseline = last7Days.reduce((sum, day) => sum + day.revenue, 0) / 7;

    const currentRevenue = revenueTrend[i].revenue;

    // Detect spike: revenue > 2× baseline
    if (baseline > 0 && currentRevenue > baseline * 2) {
      anomalies.push({
        date: revenueTrend[i].date,
        type: 'spike',
        value: currentRevenue,
        baseline: baseline
      });
    }

    // Detect drop: revenue < 0.5× baseline
    if (baseline > 0 && currentRevenue < baseline * 0.5) {
      anomalies.push({
        date: revenueTrend[i].date,
        type: 'drop',
        value: currentRevenue,
        baseline: baseline
      });
    }
  }

  return anomalies;
};

/**
 * Get product performance over time (top 3 products by revenue)
 * @param {Array} orders - Orders with price data
 * @param {Object} productsMap - Product lookup map
 * @returns {Object} Product performance data with labels and series
 */
export const getProductPerformanceOverTime = (orders, productsMap) => {
  // Calculate total revenue per product
  const productRevenue = {};
  orders.forEach(order => {
    const revenue = order.price * order.quantity;
    if (!productRevenue[order.productId]) {
      productRevenue[order.productId] = 0;
    }
    productRevenue[order.productId] += revenue;
  });

  // Get top 3 products
  const topProducts = Object.entries(productRevenue)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([productId]) => productId);

  if (topProducts.length === 0) {
    return { labels: [], series: [] };
  }

  // Get last 30 days
  const last30Days = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);
    last30Days.push(date);
  }

  // Calculate daily revenue for each top product
  const series = topProducts.map(productId => {
    const productName = productsMap[productId]?.name || 'Unknown';
    const data = last30Days.map(date => {
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      
      const dayRevenue = orders
        .filter(order => {
          if (!order.createdAt || order.productId !== productId) return false;
          const orderDate = order.createdAt.toDate();
          return orderDate >= date && orderDate < nextDate;
        })
        .reduce((sum, order) => sum + (order.price * order.quantity), 0);

      return dayRevenue;
    });

    return {
      name: productName,
      data: data
    };
  });

  const labels = last30Days.map(date => 
    date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  );

  return { labels, series };
};
