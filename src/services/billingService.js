/**
 * BILLING SERVICE - STEP 3: BILL PREVIEW & PRINT-READY INVOICE STRUCTURE
 * ========================================================================
 * 
 * This service converts order calculation output into GST-compliant,
 * print-ready, auditable, and immutable bill objects.
 * 
 * SCOPE: Data structure and formatting ONLY
 * - No UI components
 * - No printing logic
 * - No PDF generation
 * - No Firestore writes
 * - No recalculation (uses Step 2 output)
 */

// ============================================================================
// CONSTANTS
// ============================================================================

const BUSINESS_INFO = {
  businessName: 'Kamdon Fashion',
  gstin: 'GSTIN_PLACEHOLDER', // To be configured
  storeAddress: 'Store Address Line 1, City, State',
  stateCode: '27', // Maharashtra
  phone: '+91-XXXXXXXXXX',
  email: 'contact@kamdonfashion.com'
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate bill number (local-safe, non-final)
 * Format: BILL-YYMMDD-NNNN (e.g., BILL-260210-0001)
 * @returns {string} Bill number
 */
const generateBillNumber = () => {
  const now = new Date();
  const year = String(now.getFullYear()).slice(-2); // Last 2 digits of year
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  
  return `BILL-${year}${month}${day}-${random}`;
};

/**
 * Get current timestamp (UTC)
 * @returns {string} ISO timestamp
 */
const getCurrentTimestamp = () => {
  return new Date().toISOString();
};

/**
 * Apply Indian rounding rules (round to nearest rupee)
 * @param {number} amount - Amount to round
 * @returns {number} Rounded amount
 */
const applyRounding = (amount) => {
  return Math.round(amount);
};

/**
 * Calculate rounding adjustment
 * @param {number} originalAmount - Original amount
 * @param {number} roundedAmount - Rounded amount
 * @returns {number} Rounding adjustment (can be positive or negative)
 */
const calculateRoundingAdjustment = (originalAmount, roundedAmount) => {
  return roundedAmount - originalAmount;
};

// ============================================================================
// BILL GENERATION FUNCTIONS
// ============================================================================

/**
 * Generate bill from order calculation output
 * @param {Object} orderCalculation - Output from orderCalculationService
 * @param {Object} metadata - Additional bill metadata
 * @param {string} metadata.orderId - Order document ID
 * @param {string} metadata.orderType - 'store' | 'exhibition' | 'prebooking'
 * @param {string} metadata.employeeId - Employee user ID
 * @param {string} metadata.employeeName - Employee display name
 * @param {string} metadata.exhibitionId - Exhibition ID (nullable)
 * @param {Object} metadata.customer - Customer information
 * @param {string} metadata.customer.name - Customer name
 * @param {string} metadata.customer.phone - Customer phone
 * @param {string} metadata.customer.address - Customer address (optional)
 * @returns {Object} Complete bill object
 */
export const generateBill = (orderCalculation, metadata) => {
  // Validate inputs
  if (!orderCalculation || !orderCalculation.items || orderCalculation.items.length === 0) {
    throw new Error('Invalid order calculation: items array is required');
  }
  
  if (!metadata || !metadata.orderId || !metadata.orderType || !metadata.employeeId || !metadata.employeeName) {
    throw new Error('Invalid metadata: orderId, orderType, employeeId, and employeeName are required');
  }
  
  if (!metadata.customer || !metadata.customer.name || !metadata.customer.phone) {
    throw new Error('Invalid customer info: name and phone are required');
  }
  
  // Generate bill number and timestamp
  const billNumber = generateBillNumber();
  const billDate = getCurrentTimestamp();
  const generatedAt = getCurrentTimestamp();
  
  // Build line items from order calculation
  const lineItems = orderCalculation.items.map(item => ({
    sku: item.sku,
    productName: item.name,
    category: item.category,
    quantity: item.quantity,
    unitPrice: item.effectiveUnitPrice,
    discountApplied: item.lineDiscountAmount || 0,
    taxableValue: item.lineTaxableValue,
    gstRate: item.gstRate,
    cgstRate: item.gstRate / 2, // CGST is half of total GST
    cgstAmount: item.lineCGST,
    sgstRate: item.gstRate / 2, // SGST is half of total GST
    sgstAmount: item.lineSGST,
    lineTotal: item.lineTotal
  }));
  
  // Calculate totals from order calculation
  const subtotal = orderCalculation.summary.subtotal;
  const totalDiscount = orderCalculation.summary.totalDiscount;
  const totalCGST = orderCalculation.summary.totalCGST;
  const totalSGST = orderCalculation.summary.totalSGST;
  const totalTax = orderCalculation.summary.totalTax;
  const grandTotal = orderCalculation.summary.grandTotal;
  
  // Apply rounding
  const payableAmount = applyRounding(grandTotal);
  const roundedOffAmount = calculateRoundingAdjustment(grandTotal, payableAmount);
  
  // Build complete bill object
  const bill = {
    // Header
    billNumber,
    billDate,
    orderId: metadata.orderId,
    orderType: metadata.orderType,
    employeeId: metadata.employeeId,
    employeeName: metadata.employeeName,
    exhibitionId: metadata.exhibitionId || null,
    
    // Seller Info
    seller: {
      businessName: BUSINESS_INFO.businessName,
      gstin: BUSINESS_INFO.gstin,
      storeAddress: BUSINESS_INFO.storeAddress,
      stateCode: BUSINESS_INFO.stateCode,
      phone: BUSINESS_INFO.phone,
      email: BUSINESS_INFO.email
    },
    
    // Customer Info
    customer: {
      name: metadata.customer.name,
      phone: metadata.customer.phone,
      address: metadata.customer.address || ''
    },
    
    // Line Items
    lineItems,
    
    // Totals
    totals: {
      totalQuantity: orderCalculation.summary.totalQuantity,
      subtotal,
      totalDiscount,
      totalCGST,
      totalSGST,
      totalTax,
      grandTotal,
      roundedOffAmount,
      payableAmount
    },
    
    // Footer
    footer: {
      paymentMode: 'CASH', // Placeholder
      notes: ''
    },
    
    // Metadata
    generatedAt
  };
  
  return bill;
};

/**
 * Format bill for display (helper for preview)
 * @param {Object} bill - Bill object from generateBill
 * @returns {Object} Formatted bill with display-friendly values
 */
export const formatBillForDisplay = (bill) => {
  return {
    ...bill,
    billDate: new Date(bill.billDate).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'short'
    }),
    lineItems: bill.lineItems.map(item => ({
      ...item,
      unitPrice: `₹${item.unitPrice.toFixed(2)}`,
      discountApplied: `₹${item.discountApplied.toFixed(2)}`,
      taxableValue: `₹${item.taxableValue.toFixed(2)}`,
      cgstAmount: `₹${item.cgstAmount.toFixed(2)}`,
      sgstAmount: `₹${item.sgstAmount.toFixed(2)}`,
      lineTotal: `₹${item.lineTotal.toFixed(2)}`
    })),
    totals: {
      ...bill.totals,
      subtotal: `₹${bill.totals.subtotal.toFixed(2)}`,
      totalDiscount: `₹${bill.totals.totalDiscount.toFixed(2)}`,
      totalCGST: `₹${bill.totals.totalCGST.toFixed(2)}`,
      totalSGST: `₹${bill.totals.totalSGST.toFixed(2)}`,
      totalTax: `₹${bill.totals.totalTax.toFixed(2)}`,
      grandTotal: `₹${bill.totals.grandTotal.toFixed(2)}`,
      roundedOffAmount: `₹${bill.totals.roundedOffAmount.toFixed(2)}`,
      payableAmount: `₹${bill.totals.payableAmount.toFixed(2)}`
    }
  };
};

/**
 * Group line items by GST rate (helper for GST summary)
 * @param {Object} bill - Bill object
 * @returns {Array} GST summary grouped by rate
 */
export const getGSTSummary = (bill) => {
  const gstGroups = {};
  
  bill.lineItems.forEach(item => {
    const rate = item.cgstRate + item.sgstRate; // Total GST rate
    
    if (!gstGroups[rate]) {
      gstGroups[rate] = {
        gstRate: rate,
        cgstRate: item.cgstRate,
        sgstRate: item.sgstRate,
        taxableValue: 0,
        cgstAmount: 0,
        sgstAmount: 0,
        totalTax: 0
      };
    }
    
    gstGroups[rate].taxableValue += item.taxableValue;
    gstGroups[rate].cgstAmount += item.cgstAmount;
    gstGroups[rate].sgstAmount += item.sgstAmount;
    gstGroups[rate].totalTax += (item.cgstAmount + item.sgstAmount);
  });
  
  return Object.values(gstGroups).map(group => ({
    ...group,
    taxableValue: parseFloat(group.taxableValue.toFixed(2)),
    cgstAmount: parseFloat(group.cgstAmount.toFixed(2)),
    sgstAmount: parseFloat(group.sgstAmount.toFixed(2)),
    totalTax: parseFloat(group.totalTax.toFixed(2))
  }));
};

/**
 * Validate bill object structure
 * @param {Object} bill - Bill object to validate
 * @returns {Object} Validation result { valid: boolean, errors: string[] }
 */
export const validateBill = (bill) => {
  const errors = [];
  
  // Check required header fields
  if (!bill.billNumber) errors.push('Bill number is required');
  if (!bill.billDate) errors.push('Bill date is required');
  if (!bill.orderId) errors.push('Order ID is required');
  if (!bill.orderType) errors.push('Order type is required');
  if (!bill.employeeId) errors.push('Employee ID is required');
  if (!bill.employeeName) errors.push('Employee name is required');
  
  // Check seller info
  if (!bill.seller || !bill.seller.businessName) errors.push('Seller business name is required');
  if (!bill.seller || !bill.seller.gstin) errors.push('Seller GSTIN is required');
  
  // Check customer info
  if (!bill.customer || !bill.customer.name) errors.push('Customer name is required');
  if (!bill.customer || !bill.customer.phone) errors.push('Customer phone is required');
  
  // Check line items
  if (!bill.lineItems || bill.lineItems.length === 0) {
    errors.push('At least one line item is required');
  } else {
    bill.lineItems.forEach((item, index) => {
      if (!item.sku) errors.push(`Line item ${index + 1}: SKU is required`);
      if (!item.productName) errors.push(`Line item ${index + 1}: Product name is required`);
      if (item.quantity <= 0) errors.push(`Line item ${index + 1}: Quantity must be positive`);
      if (item.unitPrice < 0) errors.push(`Line item ${index + 1}: Unit price cannot be negative`);
    });
  }
  
  // Check totals
  if (!bill.totals) errors.push('Totals section is required');
  if (bill.totals && bill.totals.payableAmount <= 0) errors.push('Payable amount must be positive');
  
  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Update business information (configuration helper)
 * @param {Object} businessInfo - New business information
 */
export const updateBusinessInfo = (businessInfo) => {
  if (businessInfo.businessName) BUSINESS_INFO.businessName = businessInfo.businessName;
  if (businessInfo.gstin) BUSINESS_INFO.gstin = businessInfo.gstin;
  if (businessInfo.storeAddress) BUSINESS_INFO.storeAddress = businessInfo.storeAddress;
  if (businessInfo.stateCode) BUSINESS_INFO.stateCode = businessInfo.stateCode;
  if (businessInfo.phone) BUSINESS_INFO.phone = businessInfo.phone;
  if (businessInfo.email) BUSINESS_INFO.email = businessInfo.email;
};

/**
 * Get current business information
 * @returns {Object} Current business info
 */
export const getBusinessInfo = () => {
  return { ...BUSINESS_INFO };
};
