/**
 * PAYMENT SERVICE - STEP 6
 * ========================
 * POS-style payment recording (NOT payment processing)
 * Records payment details for accounting, GST audit, and reporting
 */

import { doc, updateDoc, arrayUnion, serverTimestamp, getDoc, Timestamp } from 'firebase/firestore';
import { db } from './firebase';

// Payment modes allowed in India
export const PAYMENT_MODES = {
  CASH: 'CASH',
  UPI: 'UPI',
  CARD: 'CARD',
  BANK_TRANSFER: 'BANK_TRANSFER',
  SPLIT: 'SPLIT'
};

// Payment status
export const PAYMENT_STATUS = {
  UNPAID: 'UNPAID',
  PARTIALLY_PAID: 'PARTIALLY_PAID',
  PAID: 'PAID'
};

/**
 * Calculate payment status based on bill and payments
 * @param {Object} bill - Bill object with totals and payments
 * @returns {Object} Payment status details
 */
export const calculatePaymentStatus = (bill) => {
  const payableAmount = bill.totals?.payableAmount || 0;
  const payments = bill.payments || [];
  
  const paidAmount = payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
  const dueAmount = Math.max(0, payableAmount - paidAmount);
  
  let paymentStatus = PAYMENT_STATUS.UNPAID;
  if (paidAmount === 0) {
    paymentStatus = PAYMENT_STATUS.UNPAID;
  } else if (dueAmount === 0) {
    paymentStatus = PAYMENT_STATUS.PAID;
  } else if (paidAmount > 0 && dueAmount > 0) {
    paymentStatus = PAYMENT_STATUS.PARTIALLY_PAID;
  }
  
  return {
    paymentStatus,
    paidAmount,
    dueAmount,
    payableAmount
  };
};

/**
 * Validate payment before recording
 * @param {Object} bill - Bill object
 * @param {Object} paymentPayload - Payment to be added
 * @returns {Object} Validation result
 */
export const validatePayment = (bill, paymentPayload) => {
  const errors = [];
  
  // Check if bill exists
  if (!bill || !bill.totals) {
    errors.push('Invalid bill data');
    return { valid: false, errors };
  }
  
  // Check if bill is already paid
  const currentStatus = calculatePaymentStatus(bill);
  if (currentStatus.paymentStatus === PAYMENT_STATUS.PAID) {
    errors.push('Bill is already fully paid and locked');
    return { valid: false, errors };
  }
  
  // Validate payment mode
  if (!Object.values(PAYMENT_MODES).includes(paymentPayload.mode)) {
    errors.push('Invalid payment mode');
  }
  
  // Validate amount
  if (!paymentPayload.amount || paymentPayload.amount <= 0) {
    errors.push('Payment amount must be greater than 0');
  }
  
  // Check for overpayment
  const newPaidAmount = currentStatus.paidAmount + paymentPayload.amount;
  if (newPaidAmount > currentStatus.payableAmount) {
    errors.push(`Overpayment not allowed. Due amount: ₹${currentStatus.dueAmount.toFixed(2)}`);
  }
  
  // Validate reference ID for UPI/CARD/BANK_TRANSFER
  if ([PAYMENT_MODES.UPI, PAYMENT_MODES.CARD, PAYMENT_MODES.BANK_TRANSFER].includes(paymentPayload.mode)) {
    if (!paymentPayload.referenceId || paymentPayload.referenceId.trim() === '') {
      errors.push(`Reference ID is required for ${paymentPayload.mode} payments`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Record payment for a bill
 * @param {string} billId - Bill document ID
 * @param {Object} paymentPayload - Payment details
 * @returns {Promise<Object>} Updated bill with payment status
 */
export const recordPayment = async (billId, paymentPayload) => {
  try {
    // Get current bill
    const billRef = doc(db, 'bills', billId);
    const billDoc = await getDoc(billRef);
    
    if (!billDoc.exists()) {
      throw new Error('Bill not found');
    }
    
    const bill = { id: billDoc.id, ...billDoc.data() };
    
    // Validate payment
    const validation = validatePayment(bill, paymentPayload);
    if (!validation.valid) {
      throw new Error(validation.errors.join(', '));
    }
    
    // Create payment entry with current timestamp
    // Note: serverTimestamp() cannot be used inside arrayUnion()
    // Use Timestamp.now() instead for consistency with Firestore
    const payment = {
      mode: paymentPayload.mode,
      amount: parseFloat(paymentPayload.amount),
      referenceId: paymentPayload.referenceId || null,
      paidAt: Timestamp.now(),
      recordedBy: paymentPayload.recordedBy || null
    };
    
    // Calculate new status
    const currentStatus = calculatePaymentStatus(bill);
    const newPaidAmount = currentStatus.paidAmount + payment.amount;
    const newDueAmount = currentStatus.payableAmount - newPaidAmount;
    
    let newPaymentStatus = PAYMENT_STATUS.PARTIALLY_PAID;
    if (newDueAmount === 0) {
      newPaymentStatus = PAYMENT_STATUS.PAID;
    }
    
    // Update bill
    const updateData = {
      payments: arrayUnion(payment),
      paidAmount: newPaidAmount,
      dueAmount: newDueAmount,
      paymentStatus: newPaymentStatus,
      updatedAt: serverTimestamp()
    };
    
    // If fully paid, lock the bill
    if (newPaymentStatus === PAYMENT_STATUS.PAID) {
      updateData.paidAt = serverTimestamp();
      updateData.locked = true;
    }
    
    await updateDoc(billRef, updateData);
    
    // Return updated bill data
    return {
      ...bill,
      ...updateData,
      payments: [...(bill.payments || []), payment]
    };
  } catch (error) {
    console.error('Error recording payment:', error);
    throw error;
  }
};

/**
 * Check if bill is locked (fully paid)
 * @param {Object} bill - Bill object
 * @returns {boolean} True if bill is locked
 */
export const isBillLocked = (bill) => {
  if (!bill) return false;
  return bill.locked === true || bill.paymentStatus === PAYMENT_STATUS.PAID;
};

/**
 * Get payment summary for display
 * @param {Object} bill - Bill object
 * @returns {Object} Payment summary
 */
export const getPaymentSummary = (bill) => {
  const status = calculatePaymentStatus(bill);
  const payments = bill.payments || [];
  
  return {
    ...status,
    paymentsCount: payments.length,
    payments: payments.map(p => ({
      ...p,
      paidAt: p.paidAt?.toDate ? p.paidAt.toDate() : p.paidAt
    })),
    isLocked: isBillLocked(bill)
  };
};
