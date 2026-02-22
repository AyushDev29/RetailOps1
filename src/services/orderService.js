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
 * @returns {Object} Created order with ID
 */
export const createOrder = async (orderData) => {
  try {
    const {
      type, // 'daily' | 'prebooking' | 'exhibition'
      customerPhone,
      items, // Array of { productId, productName, sku, quantity, unitPrice, lineTotal }
      totals, // { subtotal, totalCGST, totalSGST, totalTax, grandTotal, payableAmount }
      status,
      exhibitionId = null,
      createdBy, // employee UID
      deliveryDate = null, // for prebooking
      billId = null // Link to bill
    } = orderData;
    
    // Validate items array
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error('Order must have at least one item');
    }
    
    const orderRef = doc(collection(db, 'orders'));
    const orderDoc = {
      type,
      customerPhone,
      items,
      totals,
      status,
      exhibitionId,
      createdBy,
      deliveryDate,
      billId,
      createdAt: serverTimestamp()
    };
    
    await setDoc(orderRef, orderDoc);
    
    return {
      id: orderRef.id,
      ...orderDoc
    };
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
 * @param {string} employeeId - Employee user ID (optional for owner)
 * @param {boolean} isOwner - Whether the user is owner
 * @returns {Array} List of pending pre-booking orders
 */
export const getPendingPreBookings = async (employeeId = null, isOwner = false) => {
  try {
    let q;
    
    if (isOwner) {
      // Owner sees ALL pre-bookings
      q = query(
        collection(db, 'orders'),
        where('type', '==', 'prebooking'),
        where('status', '==', 'pending')
      );
    } else {
      // Employee sees only their own pre-bookings
      q = query(
        collection(db, 'orders'),
        where('type', '==', 'prebooking'),
        where('status', '==', 'pending'),
        where('createdBy', '==', employeeId)
      );
    }
    
    const querySnapshot = await getDocs(q);
    
    // Sort in memory by creation date
    const orders = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Sort by createdAt if it exists (newest first)
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
 * IMPORTANT: Just updates status, does NOT generate new bill (bill already exists)
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
    
    // IMPORTANT: No time restriction for manual conversion
    // Employee can convert anytime
    
    // Import required services for stock deduction only
    const { deductStockBatch } = await import('./productService');
    
    // Deduct stock when converting to sale
    if (orderData.items && Array.isArray(orderData.items)) {
      const stockItems = orderData.items.map(item => ({
        productId: item.productId,
        quantity: item.quantity
      }));
      await deductStockBatch(stockItems);
      console.log('✅ Stock deducted for pre-booking conversion');
    }
    
    // Update order status to completed
    // Bill already exists from pre-booking creation, just update status
    await updateDoc(orderRef, {
      status: 'completed',
      exhibitionId: exhibitionId || null,
      convertedAt: serverTimestamp(),
      completedAt: serverTimestamp()
    });
    
    console.log('✅ Pre-booking converted to sale (status updated)');
    
    return {
      id: preBookingId,
      ...orderData,
      status: 'completed',
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

/**
 * Auto-convert overdue pre-bookings to sales
 * This should be called periodically (e.g., on dashboard load)
 * ONLY converts pre-bookings AFTER delivery time has passed
 * @param {string} employeeId - Employee UID (optional for owner)
 * @param {boolean} isOwner - Whether the user is owner
 * @returns {Object} Conversion results { converted: number, failed: number, errors: Array }
 */
export const autoConvertOverduePreBookings = async (employeeId = null, isOwner = false) => {
  try {
    // Get all pending pre-bookings
    const pendingPreBookings = await getPendingPreBookings(employeeId, isOwner);
    
    const now = new Date();
    const results = {
      converted: 0,
      failed: 0,
      errors: []
    };
    
    // Filter ONLY overdue pre-bookings (delivery time has passed)
    const overdueBookings = pendingPreBookings.filter(booking => {
      if (!booking.deliveryDate) return false;
      const deliveryTime = new Date(booking.deliveryDate);
      return now >= deliveryTime; // Only auto-convert AFTER delivery time
    });
    
    if (overdueBookings.length > 0) {
      console.log(`[Auto-Convert] Found ${overdueBookings.length} overdue pre-bookings to convert`);
    }
    
    // Convert each overdue booking
    for (const booking of overdueBookings) {
      try {
        await convertPreBookingToSale(booking.id, null);
        results.converted++;
        console.log(`[Auto-Convert] ✅ Converted overdue pre-booking: ${booking.id}`);
      } catch (error) {
        results.failed++;
        results.errors.push({
          bookingId: booking.id,
          error: error.message
        });
        console.error(`[Auto-Convert] ❌ Failed to convert pre-booking ${booking.id}:`, error);
      }
    }
    
    return results;
  } catch (error) {
    console.error('[Auto-Convert] Error in auto-convert overdue pre-bookings:', error);
    throw error;
  }
};

/**
 * Check if a pre-booking can be converted (delivery time has passed)
 * @param {string} preBookingId - Pre-booking order ID
 * @returns {Object} { canConvert: boolean, reason: string, timeRemaining: number }
 */
export const canConvertPreBooking = async (preBookingId) => {
  try {
    const orderDoc = await getDoc(doc(db, 'orders', preBookingId));
    
    if (!orderDoc.exists()) {
      return { canConvert: false, reason: 'Pre-booking not found', timeRemaining: 0 };
    }
    
    const orderData = orderDoc.data();
    
    if (orderData.type !== 'prebooking') {
      return { canConvert: false, reason: 'Order is not a pre-booking', timeRemaining: 0 };
    }
    
    if (orderData.status !== 'pending') {
      return { canConvert: false, reason: 'Pre-booking already converted', timeRemaining: 0 };
    }
    
    if (!orderData.deliveryDate) {
      return { canConvert: true, reason: 'No delivery date set', timeRemaining: 0 };
    }
    
    const deliveryTime = new Date(orderData.deliveryDate);
    const now = new Date();
    
    if (now >= deliveryTime) {
      return { canConvert: true, reason: 'Delivery time has passed', timeRemaining: 0 };
    } else {
      const timeRemaining = Math.ceil((deliveryTime - now) / (1000 * 60)); // minutes
      return { 
        canConvert: false, 
        reason: `Delivery time not reached yet`, 
        timeRemaining: timeRemaining 
      };
    }
  } catch (error) {
    console.error('Error checking if pre-booking can be converted:', error);
    return { canConvert: false, reason: error.message, timeRemaining: 0 };
  }
};
