/**
 * BILL STORAGE SERVICE
 * ====================
 * Handles saving and retrieving bills from Firestore
 */

import { collection, doc, setDoc, getDoc, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Save bill to Firestore
 * @param {Object} bill - Bill object from billingService
 * @returns {Promise<string>} Bill document ID
 */
export const saveBill = async (bill) => {
  try {
    const billRef = doc(collection(db, 'bills'));
    
    // Clean the bill object - remove undefined values
    const cleanBill = JSON.parse(JSON.stringify(bill, (key, value) => {
      return value === undefined ? null : value;
    }));
    
    // Initialize payment fields (STEP 6)
    const payableAmount = cleanBill.totals?.payableAmount || 0;
    
    await setDoc(billRef, {
      ...cleanBill,
      billDate: Timestamp.fromDate(new Date(cleanBill.billDate)),
      generatedAt: Timestamp.fromDate(new Date(cleanBill.generatedAt)),
      createdAt: Timestamp.now(),
      // Payment fields (STEP 6)
      paymentStatus: 'UNPAID',
      payments: [],
      paidAmount: 0,
      dueAmount: payableAmount,
      locked: false
    });
    
    console.log('Bill saved successfully with ID:', billRef.id);
    return billRef.id;
  } catch (error) {
    console.error('Error saving bill:', error);
    throw error;
  }
};

/**
 * Get today's bills for an employee
 * @param {string} employeeId - Employee user ID
 * @returns {Promise<Array>} List of today's bills
 */
/**
 * Get today's bills
 * @param {string} employeeId - Employee user ID (optional for owner)
 * @param {boolean} isOwner - Whether the user is owner
 * @returns {Promise<Array>} List of today's bills
 */
export const getTodaysBills = async (employeeId = null, isOwner = false) => {
  try {
    // Get current time in IST
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
    const istNow = new Date(now.getTime() + istOffset);
    
    // Get start of today in IST (00:00:00)
    const todayStartIST = new Date(Date.UTC(
      istNow.getUTCFullYear(),
      istNow.getUTCMonth(),
      istNow.getUTCDate(),
      0, 0, 0, 0
    ));
    
    // Get end of today in IST (23:59:59.999)
    const todayEndIST = new Date(Date.UTC(
      istNow.getUTCFullYear(),
      istNow.getUTCMonth(),
      istNow.getUTCDate(),
      23, 59, 59, 999
    ));
    
    // Convert IST times to UTC timestamps for Firestore comparison
    const todayStartUTC = todayStartIST.getTime() - istOffset;
    const todayEndUTC = todayEndIST.getTime() - istOffset;
    
    console.log('🕐 Current IST time:', istNow.toISOString());
    console.log('📅 Today start (IST):', todayStartIST.toISOString(), '→ UTC:', new Date(todayStartUTC).toISOString());
    console.log('📅 Today end (IST):', todayEndIST.toISOString(), '→ UTC:', new Date(todayEndUTC).toISOString());
    
    let querySnapshot;
    
    if (isOwner) {
      // Owner sees ALL bills
      querySnapshot = await getDocs(collection(db, 'bills'));
    } else {
      // Employee sees only their own bills
      const q = query(
        collection(db, 'bills'),
        where('employeeId', '==', employeeId)
      );
      querySnapshot = await getDocs(q);
    }
    
    // Filter by date and sort in memory
    const bills = querySnapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      .filter(bill => {
        // Filter for today's bills (in IST timezone)
        const billTime = bill.createdAt?.toMillis() || 0;
        const isToday = billTime >= todayStartUTC && billTime <= todayEndUTC;
        
        if (billTime > 0) {
          console.log(`  Bill ${bill.billNumber}: ${new Date(billTime).toISOString()} → isToday: ${isToday}`);
        }
        
        return isToday;
      })
      .sort((a, b) => {
        // Sort by createdAt descending (newest first)
        const aTime = a.createdAt?.toMillis() || 0;
        const bTime = b.createdAt?.toMillis() || 0;
        return bTime - aTime;
      });
    
    console.log('✅ Today\'s bills count:', bills.length);
    
    return bills;
  } catch (error) {
    console.error('Error fetching today\'s bills:', error);
    throw error;
  }
};

/**
 * Get all bills (owner only)
 * @param {Date} startDate - Optional start date filter
 * @param {Date} endDate - Optional end date filter
 * @returns {Promise<Array>} List of bills
 */
export const getAllBills = async (startDate = null, endDate = null) => {
  try {
    let constraints = [];
    
    if (startDate) {
      constraints.push(where('createdAt', '>=', Timestamp.fromDate(startDate)));
    }
    
    if (endDate) {
      constraints.push(where('createdAt', '<=', Timestamp.fromDate(endDate)));
    }
    
    const q = query(collection(db, 'bills'), ...constraints);
    
    const querySnapshot = await getDocs(q);
    
    // Sort in memory to avoid index requirement
    const bills = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Sort by createdAt descending (newest first)
    bills.sort((a, b) => {
      const aTime = a.createdAt?.toMillis() || 0;
      const bTime = b.createdAt?.toMillis() || 0;
      return bTime - aTime;
    });
    
    return bills;
  } catch (error) {
    console.error('Error fetching all bills:', error);
    throw error;
  }
};

/**
 * Get bill by ID
 * @param {string} billId - Bill document ID
 * @returns {Promise<Object|null>} Bill data or null
 */
export const getBillById = async (billId) => {
  try {
    const billDoc = await getDoc(doc(db, 'bills', billId));
    
    if (!billDoc.exists()) {
      return null;
    }
    
    return {
      id: billDoc.id,
      ...billDoc.data()
    };
  } catch (error) {
    console.error('Error fetching bill:', error);
    throw error;
  }
};
