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
    
    // KEEP TYPE AS PREBOOKING - don't change to daily or exhibition
    // This ensures analytics track it correctly as a pre-booking sale
    
    // Import required services
    const { generateBill } = await import('./billingService');
    const { saveBill } = await import('./billStorageService');
    const { deductStockBatch, getProductById } = await import('./productService');
    const { calculateOrder } = await import('./orderCalculationService');
    
    // Fetch full product details for each item to get GST rates and other required fields
    const itemsWithProductDetails = await Promise.all(
      orderData.items.map(async (item) => {
        const product = await getProductById(item.productId);
        if (!product) {
          throw new Error(`Product not found: ${item.productId}`);
        }
        return {
          productId: item.productId,
          name: item.productName,
          sku: product.sku,
          category: product.category,
          quantity: item.quantity,
          unitBasePrice: product.basePrice,
          unitSalePrice: product.isOnSale ? product.salePrice : null,
          gstRate: product.gstRate,
          isTaxInclusive: product.isTaxInclusive
        };
      })
    );
    
    // Calculate order totals
    const orderCalculation = calculateOrder({
      items: itemsWithProductDetails,
      employeeDiscount: 0
    });
    
    // Generate bill for the order - use 'prebooking' as orderType
    const bill = generateBill(orderCalculation, {
      orderId: preBookingId,
      orderType: 'prebooking',
      employeeId: orderData.createdBy,
      employeeName: orderData.employeeName || 'Employee',
      exhibitionId: exhibitionId || null,
      customer: {
        name: orderData.customerName || 'Customer',
        phone: orderData.customerPhone,
        address: orderData.customerAddress || ''
      }
    });
    
    // Store the bill
    const billId = await saveBill(bill);
    
    // Record payment if provided (STEP 6)
    // Note: Payment should be collected when converting pre-booking
    // For now, we'll mark it as UNPAID and let employee record payment after conversion
    // Future enhancement: Add payment UI to conversion flow
    
    // Deduct stock
    if (orderData.items && Array.isArray(orderData.items)) {
      // New schema - multiple items
      const stockItems = orderData.items.map(item => ({
        productId: item.productId,
        quantity: item.quantity
      }));
      await deductStockBatch(stockItems);
    } else if (orderData.productId) {
      // Old schema - single product
      await deductStockBatch([{
        productId: orderData.productId,
        quantity: orderData.quantity
      }]);
    }
    
    // Update order to completed - KEEP TYPE AS PREBOOKING
    await updateDoc(orderRef, {
      status: 'completed',
      exhibitionId: exhibitionId || null,
      billId: billId,
      convertedAt: serverTimestamp(),
      completedAt: serverTimestamp()
    });
    
    return {
      id: preBookingId,
      ...orderData,
      status: 'completed',
      exhibitionId,
      billId: billId,
      bill: bill
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
