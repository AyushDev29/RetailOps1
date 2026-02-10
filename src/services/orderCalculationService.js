/**
 * ORDER CALCULATION ENGINE
 * ========================
 * Government-compliant GST calculation with role-safe discount enforcement
 * 
 * CRITICAL RULES:
 * - Employees cannot control GST rate, tax amount, or sale price
 * - All calculations are deterministic and reproducible
 * - GST = CGST + SGST (50/50 split)
 * - Employee discount max 10%, only if product NOT on sale
 * - Sale price overrides all discounts
 */

// ============================================================================
// CONSTANTS
// ============================================================================

const VALID_GST_RATES = [5, 12, 18];
const MAX_EMPLOYEE_DISCOUNT_PERCENT = 10;
const GST_SPLIT_RATIO = 0.5; // CGST and SGST are 50/50

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate cart item structure
 * @param {Object} item - Cart item to validate
 * @throws {Error} If validation fails
 */
const validateCartItem = (item) => {
  const errors = [];

  if (!item.productId || typeof item.productId !== 'string') {
    errors.push('Product ID is required');
  }

  if (!item.name || typeof item.name !== 'string') {
    errors.push('Product name is required');
  }

  if (!item.sku || typeof item.sku !== 'string') {
    errors.push('Product SKU is required');
  }

  if (!item.category || !['men', 'women', 'kids'].includes(item.category)) {
    errors.push('Valid category is required (men, women, kids)');
  }

  if (typeof item.quantity !== 'number' || item.quantity <= 0) {
    errors.push('Quantity must be a positive number');
  }

  if (typeof item.unitBasePrice !== 'number' || item.unitBasePrice <= 0) {
    errors.push('Unit base price must be a positive number');
  }

  if (item.unitSalePrice !== null && item.unitSalePrice !== undefined) {
    if (typeof item.unitSalePrice !== 'number' || item.unitSalePrice <= 0) {
      errors.push('Unit sale price must be a positive number or null');
    }
    if (item.unitSalePrice >= item.unitBasePrice) {
      errors.push('Sale price must be lower than base price');
    }
  }

  if (!VALID_GST_RATES.includes(item.gstRate)) {
    errors.push(`GST rate must be one of: ${VALID_GST_RATES.join(', ')}`);
  }

  if (typeof item.isTaxInclusive !== 'boolean') {
    errors.push('isTaxInclusive must be a boolean');
  }

  if (errors.length > 0) {
    throw new Error('Cart item validation failed: ' + errors.join(', '));
  }
};

/**
 * Validate employee discount
 * @param {number} discountPercent - Discount percentage
 * @param {boolean} isOnSale - Whether product is on sale
 * @throws {Error} If validation fails
 */
const validateEmployeeDiscount = (discountPercent, isOnSale) => {
  if (discountPercent < 0) {
    throw new Error('Discount cannot be negative');
  }

  if (discountPercent > MAX_EMPLOYEE_DISCOUNT_PERCENT) {
    throw new Error(`Employee discount cannot exceed ${MAX_EMPLOYEE_DISCOUNT_PERCENT}%`);
  }

  if (isOnSale && discountPercent > 0) {
    throw new Error('Employee discount cannot be applied to products on sale');
  }
};

// ============================================================================
// GST CALCULATION FUNCTIONS
// ============================================================================

/**
 * Calculate taxable value and GST amounts
 * @param {number} price - Price (base or sale)
 * @param {number} gstRate - GST rate (5, 12, or 18)
 * @param {boolean} isTaxInclusive - Whether price includes tax
 * @returns {Object} Taxable value, CGST, SGST, total tax
 */
const calculateGST = (price, gstRate, isTaxInclusive) => {
  if (!VALID_GST_RATES.includes(gstRate)) {
    throw new Error(`Invalid GST rate: ${gstRate}`);
  }

  let taxableValue;
  let totalTax;

  if (isTaxInclusive) {
    // Back-calculate taxable value from inclusive price
    // Formula: Taxable Value = Inclusive Price / (1 + GST Rate / 100)
    taxableValue = price / (1 + gstRate / 100);
    totalTax = price - taxableValue;
  } else {
    // Add GST on top of price
    taxableValue = price;
    totalTax = (price * gstRate) / 100;
  }

  // Split GST into CGST and SGST (50/50)
  const cgstAmount = totalTax * GST_SPLIT_RATIO;
  const sgstAmount = totalTax * GST_SPLIT_RATIO;

  return {
    taxableValue: parseFloat(taxableValue.toFixed(2)),
    cgstAmount: parseFloat(cgstAmount.toFixed(2)),
    sgstAmount: parseFloat(sgstAmount.toFixed(2)),
    totalTax: parseFloat(totalTax.toFixed(2))
  };
};

// ============================================================================
// DISCOUNT CALCULATION FUNCTIONS
// ============================================================================

/**
 * Calculate effective unit price after discount
 * @param {number} basePrice - Base price
 * @param {number} salePrice - Sale price (nullable)
 * @param {number} discountPercent - Employee discount percentage
 * @param {boolean} isOnSale - Whether product is on sale
 * @returns {Object} Effective price and discount amount
 */
const calculateEffectivePrice = (basePrice, salePrice, discountPercent, isOnSale) => {
  // Validate discount
  validateEmployeeDiscount(discountPercent, isOnSale);

  let effectivePrice;
  let discountAmount = 0;

  if (isOnSale && salePrice !== null && salePrice !== undefined) {
    // RULE: Sale price overrides all discounts
    effectivePrice = salePrice;
    discountAmount = 0;
  } else if (discountPercent > 0) {
    // Apply employee discount to base price
    discountAmount = (basePrice * discountPercent) / 100;
    effectivePrice = basePrice - discountAmount;
  } else {
    // No discount, use base price
    effectivePrice = basePrice;
    discountAmount = 0;
  }

  return {
    effectivePrice: parseFloat(effectivePrice.toFixed(2)),
    discountAmount: parseFloat(discountAmount.toFixed(2))
  };
};

// ============================================================================
// CART ITEM CALCULATION
// ============================================================================

/**
 * Calculate all values for a single cart item
 * @param {Object} item - Cart item with product snapshot
 * @param {number} employeeDiscountPercent - Employee discount (0-10)
 * @returns {Object} Cart item with calculated values
 */
export const calculateCartItem = (item, employeeDiscountPercent = 0) => {
  // Validate input
  validateCartItem(item);

  // Determine if product is on sale
  const isOnSale = item.unitSalePrice !== null && item.unitSalePrice !== undefined;

  // Calculate effective unit price after discount
  const { effectivePrice, discountAmount } = calculateEffectivePrice(
    item.unitBasePrice,
    item.unitSalePrice,
    employeeDiscountPercent,
    isOnSale
  );

  // Calculate GST for the effective price
  const gstCalculation = calculateGST(
    effectivePrice,
    item.gstRate,
    item.isTaxInclusive
  );

  // Calculate line totals
  const lineSubtotal = effectivePrice * item.quantity;
  const lineTaxableValue = gstCalculation.taxableValue * item.quantity;
  const lineCGST = gstCalculation.cgstAmount * item.quantity;
  const lineSGST = gstCalculation.sgstAmount * item.quantity;
  const lineTotalTax = gstCalculation.totalTax * item.quantity;
  const lineTotal = item.isTaxInclusive 
    ? lineSubtotal 
    : lineTaxableValue + lineTotalTax;
  const lineDiscountAmount = discountAmount * item.quantity;

  return {
    // Original item data (snapshot)
    productId: item.productId,
    name: item.name,
    sku: item.sku,
    category: item.category,
    quantity: item.quantity,
    unitBasePrice: item.unitBasePrice,
    unitSalePrice: item.unitSalePrice,
    gstRate: item.gstRate,
    isTaxInclusive: item.isTaxInclusive,

    // Calculated per-unit values
    effectiveUnitPrice: effectivePrice,
    unitDiscountAmount: discountAmount,
    unitTaxableValue: gstCalculation.taxableValue,
    unitCGST: gstCalculation.cgstAmount,
    unitSGST: gstCalculation.sgstAmount,
    unitTotalTax: gstCalculation.totalTax,

    // Calculated line totals
    lineSubtotal: parseFloat(lineSubtotal.toFixed(2)),
    lineTaxableValue: parseFloat(lineTaxableValue.toFixed(2)),
    lineDiscountAmount: parseFloat(lineDiscountAmount.toFixed(2)),
    lineCGST: parseFloat(lineCGST.toFixed(2)),
    lineSGST: parseFloat(lineSGST.toFixed(2)),
    lineTotalTax: parseFloat(lineTotalTax.toFixed(2)),
    lineTotal: parseFloat(lineTotal.toFixed(2))
  };
};

// ============================================================================
// ORDER TOTALS CALCULATION
// ============================================================================

/**
 * Calculate order totals from cart items
 * @param {Array} cartItems - Array of cart items (with product snapshots)
 * @param {number} employeeDiscountPercent - Employee discount (0-10)
 * @returns {Object} Order summary with totals
 */
export const calculateOrderTotals = (cartItems, employeeDiscountPercent = 0) => {
  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    throw new Error('Cart items must be a non-empty array');
  }

  if (employeeDiscountPercent < 0 || employeeDiscountPercent > MAX_EMPLOYEE_DISCOUNT_PERCENT) {
    throw new Error(`Employee discount must be between 0 and ${MAX_EMPLOYEE_DISCOUNT_PERCENT}%`);
  }

  // Calculate each cart item
  const calculatedItems = cartItems.map(item => 
    calculateCartItem(item, employeeDiscountPercent)
  );

  // Aggregate totals
  const totalItems = calculatedItems.length;
  const totalQuantity = calculatedItems.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = calculatedItems.reduce((sum, item) => sum + item.lineSubtotal, 0);
  const totalDiscount = calculatedItems.reduce((sum, item) => sum + item.lineDiscountAmount, 0);
  const totalTaxableValue = calculatedItems.reduce((sum, item) => sum + item.lineTaxableValue, 0);
  const totalCGST = calculatedItems.reduce((sum, item) => sum + item.lineCGST, 0);
  const totalSGST = calculatedItems.reduce((sum, item) => sum + item.lineSGST, 0);
  const totalTax = calculatedItems.reduce((sum, item) => sum + item.lineTotalTax, 0);
  const grandTotal = calculatedItems.reduce((sum, item) => sum + item.lineTotal, 0);

  // Validate no negative totals
  if (grandTotal < 0) {
    throw new Error('Grand total cannot be negative');
  }

  return {
    // Order metadata
    totalItems,
    totalQuantity,
    employeeDiscountPercent,

    // Calculated items
    items: calculatedItems,

    // Order totals
    subtotal: parseFloat(subtotal.toFixed(2)),
    totalDiscount: parseFloat(totalDiscount.toFixed(2)),
    totalTaxableValue: parseFloat(totalTaxableValue.toFixed(2)),
    totalCGST: parseFloat(totalCGST.toFixed(2)),
    totalSGST: parseFloat(totalSGST.toFixed(2)),
    totalTax: parseFloat(totalTax.toFixed(2)),
    grandTotal: parseFloat(grandTotal.toFixed(2))
  };
};

// ============================================================================
// CART MANAGEMENT FUNCTIONS (IN-MEMORY)
// ============================================================================

/**
 * Create cart item from product snapshot
 * @param {Object} product - Product data from productService
 * @param {number} quantity - Quantity to add
 * @returns {Object} Cart item structure
 */
export const createCartItemFromProduct = (product, quantity = 1) => {
  if (!product || !product.id) {
    throw new Error('Valid product is required');
  }

  if (typeof quantity !== 'number' || quantity <= 0) {
    throw new Error('Quantity must be a positive number');
  }

  return {
    productId: product.id,
    name: product.name,
    sku: product.sku,
    category: product.category,
    quantity: quantity,
    unitBasePrice: product.basePrice,
    unitSalePrice: product.isOnSale ? product.salePrice : null,
    gstRate: product.gstRate,
    isTaxInclusive: product.isTaxInclusive
  };
};

/**
 * Add item to cart (in-memory)
 * @param {Array} cart - Current cart items
 * @param {Object} newItem - New cart item
 * @returns {Array} Updated cart
 */
export const addToCart = (cart, newItem) => {
  if (!Array.isArray(cart)) {
    throw new Error('Cart must be an array');
  }

  validateCartItem(newItem);

  // Check if product already in cart
  const existingIndex = cart.findIndex(item => item.productId === newItem.productId);

  if (existingIndex >= 0) {
    // Update quantity of existing item
    const updatedCart = [...cart];
    updatedCart[existingIndex] = {
      ...updatedCart[existingIndex],
      quantity: updatedCart[existingIndex].quantity + newItem.quantity
    };
    return updatedCart;
  } else {
    // Add new item
    return [...cart, newItem];
  }
};

/**
 * Update cart item quantity
 * @param {Array} cart - Current cart items
 * @param {string} productId - Product ID to update
 * @param {number} newQuantity - New quantity
 * @returns {Array} Updated cart
 */
export const updateCartItemQuantity = (cart, productId, newQuantity) => {
  if (!Array.isArray(cart)) {
    throw new Error('Cart must be an array');
  }

  if (typeof newQuantity !== 'number' || newQuantity <= 0) {
    throw new Error('Quantity must be a positive number');
  }

  const updatedCart = cart.map(item => 
    item.productId === productId 
      ? { ...item, quantity: newQuantity }
      : item
  );

  return updatedCart;
};

/**
 * Remove item from cart
 * @param {Array} cart - Current cart items
 * @param {string} productId - Product ID to remove
 * @returns {Array} Updated cart
 */
export const removeFromCart = (cart, productId) => {
  if (!Array.isArray(cart)) {
    throw new Error('Cart must be an array');
  }

  return cart.filter(item => item.productId !== productId);
};

/**
 * Clear entire cart
 * @returns {Array} Empty cart
 */
export const clearCart = () => {
  return [];
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format currency for display
 * @param {number} amount - Amount to format
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount) => {
  return `₹${amount.toFixed(2)}`;
};

/**
 * Get GST breakdown summary
 * @param {Object} orderTotals - Order totals from calculateOrderTotals
 * @returns {Object} GST breakdown
 */
export const getGSTBreakdown = (orderTotals) => {
  return {
    taxableValue: orderTotals.totalTaxableValue,
    cgst: orderTotals.totalCGST,
    sgst: orderTotals.totalSGST,
    totalGST: orderTotals.totalTax,
    gstPercentage: orderTotals.totalTaxableValue > 0 
      ? ((orderTotals.totalTax / orderTotals.totalTaxableValue) * 100).toFixed(2)
      : 0
  };
};

/**
 * Calculate complete order (wrapper function for convenience)
 * Processes cart and returns calculated items with totals
 * @param {Object} cart - Cart object with items array and optional employeeDiscount
 * @param {Array} cart.items - Array of cart items
 * @param {number} cart.employeeDiscount - Employee discount percentage (0-10)
 * @returns {Object} Complete order calculation with items and summary
 */
export const calculateOrder = (cart) => {
  if (!cart || !cart.items || !Array.isArray(cart.items)) {
    throw new Error('Cart must have an items array');
  }

  const employeeDiscountPercent = cart.employeeDiscount || 0;

  // Calculate each cart item
  const calculatedItems = cart.items.map(item => 
    calculateCartItem(item, employeeDiscountPercent)
  );

  // Calculate order totals
  const summary = calculateOrderTotals(calculatedItems, employeeDiscountPercent);

  return {
    items: calculatedItems,
    summary
  };
};
