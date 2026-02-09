import { 
  collection, 
  query, 
  where, 
  getDocs
} from 'firebase/firestore';
import { db } from './firebase';

/**
 * Get orders for analytics (NO PRICE/REVENUE FIELDS)
 * Includes: daily, exhibition, and converted pre-bookings only
 * Excludes: pending pre-bookings
 * @param {Object} filters - { startDate, endDate, gender, ageGroup, exhibitionId, employeeId }
 * @returns {Array} Orders with customerPhone, type, status, createdAt, createdBy, exhibitionId
 */
export const getOrdersForAnalytics = async (filters = {}) => {
  try {
    const { startDate, endDate, gender, ageGroup, exhibitionId, employeeId } = filters;
    
    // Fetch all orders (no compound queries to avoid index requirements)
    const querySnapshot = await getDocs(collection(db, 'orders'));
    
    let orders = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        type: data.type,
        status: data.status,
        customerPhone: data.customerPhone,
        createdAt: data.createdAt,
        createdBy: data.createdBy,
        exhibitionId: data.exhibitionId
        // NO price, NO revenue, NO amount
      };
    });
    
    // Filter in memory to avoid compound index requirements
    orders = orders.filter(order => {
      // Exclude pending pre-bookings (only converted ones count as sales)
      if (order.type === 'prebooking' && order.status === 'pending') {
        return false;
      }
      
      // Filter by date range
      if (startDate && order.createdAt) {
        const orderDate = order.createdAt.toDate();
        if (orderDate < startDate) return false;
      }
      if (endDate && order.createdAt) {
        const orderDate = order.createdAt.toDate();
        if (orderDate > endDate) return false;
      }
      
      // Filter by exhibition
      if (exhibitionId && order.exhibitionId !== exhibitionId) {
        return false;
      }
      
      // Filter by employee
      if (employeeId && order.createdBy !== employeeId) {
        return false;
      }
      
      return true;
    });
    
    // Sort by createdAt in memory
    orders.sort((a, b) => {
      if (!a.createdAt || !b.createdAt) return 0;
      return b.createdAt.toMillis() - a.createdAt.toMillis();
    });
    
    return orders;
  } catch (error) {
    console.error('Error fetching orders for analytics:', error);
    throw error;
  }
};

/**
 * Get customer data for analytics
 * @param {Array} customerPhones - Array of phone numbers
 * @returns {Object} Map of phone -> {gender, ageGroup}
 */
export const getCustomersForAnalytics = async (customerPhones) => {
  try {
    if (!customerPhones || customerPhones.length === 0) {
      return {};
    }
    
    // Fetch customers by phone
    const customersMap = {};
    const querySnapshot = await getDocs(collection(db, 'customers'));
    
    querySnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (customerPhones.includes(data.phone)) {
        customersMap[data.phone] = {
          gender: data.gender,
          ageGroup: data.ageGroup
        };
      }
    });
    
    return customersMap;
  } catch (error) {
    console.error('Error fetching customers for analytics:', error);
    throw error;
  }
};

/**
 * Get all exhibitions for filter dropdown
 * @returns {Array} Exhibitions with id, location, createdBy
 */
export const getExhibitionsForFilter = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'exhibitions'));
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      location: doc.data().location,
      createdBy: doc.data().createdBy,
      active: doc.data().active
    }));
  } catch (error) {
    console.error('Error fetching exhibitions for filter:', error);
    throw error;
  }
};
