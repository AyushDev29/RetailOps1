import { 
  collection, 
  doc, 
  getDoc,
  getDocs, 
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from './firebase';

/**
 * Create a new order
 * @param {Object} orderData - Order information
 * @returns {string} Order document ID
 */
export const createOrder = async (orderData) => {
  try {
    const {
      type, // 'daily' | 'prebooking' | 'exhibition'
      customerPhone,
      productId,
      price,
      quantity = 1,
      status,
      exhibitionId = null,
      createdBy, // employee UID
      deliveryDate = null // for prebooking
    } = orderData;
    
    const orderRef = doc(collection(db, 'orders'));
    await setDoc(orderRef, {
      type,
      customerPhone,
      productId,
      price,
      quantity,
      status,
      exhibitionId,
      createdBy,
      deliveryDate,
      createdAt: serverTimestamp()
    });
    
    return orderRef.id;
  } catch (error) {
    console.error('Error creating order:', error);
    throw error;
  }
};

/**
 * Get order by ID
 * @param {string} orderId - Order document ID
 * @returns {Object|null} Order data or null
 */
export const getOrderById = async (orderId) => {
  try {
    const orderDoc = await getDoc(doc(db, 'orders', orderId));
    
    if (!orderDoc.exists()) {
      return null;
    }
    
    return {
      id: orderDoc.id,
      ...orderDoc.data()
    };
  } catch (error) {
    console.error('Error fetching order:', error);
    throw error;
  }
};

/**
 * Get all orders by type
 * @param {string} type - Order type ('daily' | 'prebooking' | 'exhibition')
 * @returns {Array} List of orders
 */
export const getOrdersByType = async (type) => {
  try {
    const q = query(
      collection(db, 'orders'),
      where('type', '==', type)
    );
    const querySnapshot = await getDocs(q);
    
    // Sort in memory
    const orders = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return orders.sort((a, b) => {
      if (!a.createdAt || !b.createdAt) return 0;
      return b.createdAt.toMillis() - a.createdAt.toMillis();
    });
  } catch (error) {
    console.error('Error fetching orders by type:', error);
    throw error;
  }
};

/**
 * Get orders by employee
 * @param {string} employeeId - Employee UID
 * @returns {Array} List of orders
 */
export const getOrdersByEmployee = async (employeeId) => {
  try {
    const q = query(
      collection(db, 'orders'),
      where('createdBy', '==', employeeId)
    );
    const querySnapshot = await getDocs(q);
    
    // Sort in memory
    const orders = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return orders.sort((a, b) => {
      if (!a.createdAt || !b.createdAt) return 0;
      return b.createdAt.toMillis() - a.createdAt.toMillis();
    });
  } catch (error) {
    console.error('Error fetching orders by employee:', error);
    throw error;
  }
};

/**
 * Get pending pre-bookings
 * @returns {Array} List of pending pre-booking orders
 */
export const getPendingPreBookings = async () => {
  try {
    const q = query(
      collection(db, 'orders'),
      where('type', '==', 'prebooking'),
      where('status', '==', 'pending')
      // Note: orderBy removed to avoid index requirement
      // Results will be in document creation order
    );
    const querySnapshot = await getDocs(q);
    
    // Sort in memory instead
    const orders = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Sort by createdAt if it exists
    return orders.sort((a, b) => {
      if (!a.createdAt || !b.createdAt) return 0;
      return b.createdAt.toMillis() - a.createdAt.toMillis();
    });
  } catch (error) {
    console.error('Error fetching pending pre-bookings:', error);
    throw error;
  }
};

/**
 * Convert pre-booking to final sale
 * @param {string} preBookingId - Pre-booking order ID
 * @param {string|null} exhibitionId - Exhibition ID if converting at exhibition
 * @returns {Object} Updated order data
 */
export const convertPreBookingToSale = async (preBookingId, exhibitionId = null) => {
  try {
    const orderRef = doc(db, 'orders', preBookingId);
    const orderDoc = await getDoc(orderRef);
    
    if (!orderDoc.exists()) {
      throw new Error('Pre-booking not found');
    }
    
    const orderData = orderDoc.data();
    
    if (orderData.type !== 'prebooking') {
      throw new Error('Order is not a pre-booking');
    }
    
    if (orderData.status !== 'pending') {
      throw new Error('Pre-booking already converted');
    }
    
    // Determine new type based on exhibition
    const newType = exhibitionId ? 'exhibition' : 'daily';
    
    // Update order
    await updateDoc(orderRef, {
      type: newType,
      status: 'prebooked', // Special status to indicate it was converted from pre-booking
      exhibitionId: exhibitionId || null,
      convertedAt: serverTimestamp()
    });
    
    return {
      id: preBookingId,
      ...orderData,
      type: newType,
      status: 'prebooked',
      exhibitionId
    };
  } catch (error) {
    console.error('Error converting pre-booking:', error);
    throw error;
  }
};

/**
 * Update order status
 * @param {string} orderId - Order document ID
 * @param {string} status - New status
 */
export const updateOrderStatus = async (orderId, status) => {
  try {
    const orderRef = doc(db, 'orders', orderId);
    await updateDoc(orderRef, {
      status,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    throw error;
  }
};

/**
 * Get orders by exhibition
 * @param {string} exhibitionId - Exhibition ID
 * @returns {Array} List of orders for exhibition
 */
export const getOrdersByExhibition = async (exhibitionId) => {
  try {
    const q = query(
      collection(db, 'orders'),
      where('exhibitionId', '==', exhibitionId)
    );
    const querySnapshot = await getDocs(q);
    
    // Sort in memory
    const orders = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return orders.sort((a, b) => {
      if (!a.createdAt || !b.createdAt) return 0;
      return b.createdAt.toMillis() - a.createdAt.toMillis();
    });
  } catch (error) {
    console.error('Error fetching orders by exhibition:', error);
    throw error;
  }
};

/**
 * Get all orders (for owner/analytics)
 * @returns {Array} List of all orders
 */
export const getAllOrders = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'orders'));
    
    // Sort in memory
    const orders = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return orders.sort((a, b) => {
      if (!a.createdAt || !b.createdAt) return 0;
      return b.createdAt.toMillis() - a.createdAt.toMillis();
    });
  } catch (error) {
    console.error('Error fetching all orders:', error);
    throw error;
  }
};
