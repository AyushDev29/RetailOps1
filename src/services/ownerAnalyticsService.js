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
