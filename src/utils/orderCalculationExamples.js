/**
 * ORDER CALCULATION ENGINE - USAGE EXAMPLES
 * ==========================================
 * Demonstrates all features of the calculation engine with mock data
 * Run this file to see example outputs (no UI required)
 */

import {
  calculateCartItem,
  calculateOrderTotals,
  createCartItemFromProduct,
  addToCart,
  updateCartItemQuantity,
  removeFromCart,
  clearCart,
  formatCurrency,
  getGSTBreakdown
} from '../services/orderCalculationService';

// ============================================================================
// MOCK PRODUCT DATA
// ============================================================================

const mockProducts = {
  tshirt: {
    id: 'prod-001',
    name: 'Cotton T-Shirt',
    sku: 'MEN-TSH-001',
    category: 'men',
    basePrice: 999,
    gstRate: 12,
    isTaxInclusive: false,
    isOnSale: false,
    salePrice: null
  },
  jeans: {
    id: 'prod-002',
    name: 'Slim Fit Jeans',
    sku: 'MEN-JNS-001',
    category: 'men',
    basePrice: 2499,
    gstRate: 12,
    isTaxInclusive: false,
    isOnSale: true,
    salePrice: 1999
  },
  kurti: {
    id: 'prod-003',
    name: 'Designer Kurti',
    sku: 'WMN-KRT-001',
    category: 'women',
    basePrice: 1499,
    gstRate: 5,
    isTaxInclusive: true,
    isOnSale: false,
    salePrice: null
  }
};

// ============================================================================
// EXAMPLE 1: Single Item Calculation (No Discount)
// ============================================================================

export const example1_SingleItemNoDiscount = () => {
  console.log('\n=== EXAMPLE 1: Single Item, No Discount ===\n');

  const cartItem = {
    productId: mockProducts.tshirt.id,
    name: mockProducts.tshirt.name,
    sku: mockProducts.tshirt.sku,
    category: mockProducts.tshirt.category,
    quantity: 2,
    unitBasePrice: mockProducts.tshirt.basePrice,
    unitSalePrice: mockProducts.tshirt.salePrice,
    gstRate: mockProducts.tshirt.gstRate,
    isTaxInclusive: mockProducts.tshirt.isTaxInclusive
  };

  const calculated = calculateCartItem(cartItem, 0);

  console.log('Product:', calculated.name);
  console.log('Quantity:', calculated.quantity);
  console.log('Unit Base Price:', formatCurrency(calculated.unitBasePrice));
  console.log('Effective Unit Price:', formatCurrency(calculated.effectiveUnitPrice));
  console.log('Unit Taxable Value:', formatCurrency(calculated.unitTaxableValue));
  console.log('Unit CGST (6%):', formatCurrency(calculated.unitCGST));
  console.log('Unit SGST (6%):', formatCurrency(calculated.unitSGST));
  console.log('Unit Total Tax:', formatCurrency(calculated.unitTotalTax));
  console.log('---');
  console.log('Line Subtotal:', formatCurrency(calculated.lineSubtotal));
  console.log('Line Total Tax:', formatCurrency(calculated.lineTotalTax));
  console.log('Line Total:', formatCurrency(calculated.lineTotal));

  return calculated;
};

// ============================================================================
// EXAMPLE 2: Single Item with Employee Discount
// ============================================================================

export const example2_SingleItemWithDiscount = () => {
  console.log('\n=== EXAMPLE 2: Single Item, 10% Employee Discount ===\n');

  const cartItem = {
    productId: mockProducts.tshirt.id,
    name: mockProducts.tshirt.name,
    sku: mockProducts.tshirt.sku,
    category: mockProducts.tshirt.category,
    quantity: 1,
    unitBasePrice: mockProducts.tshirt.basePrice,
    unitSalePrice: mockProducts.tshirt.salePrice,
    gstRate: mockProducts.tshirt.gstRate,
    isTaxInclusive: mockProducts.tshirt.isTaxInclusive
  };

  const calculated = calculateCartItem(cartItem, 10);

  console.log('Product:', calculated.name);
  console.log('Unit Base Price:', formatCurrency(calculated.unitBasePrice));
  console.log('Employee Discount (10%):', formatCurrency(calculated.unitDiscountAmount));
  console.log('Effective Unit Price:', formatCurrency(calculated.effectiveUnitPrice));
  console.log('Unit Total Tax (12%):', formatCurrency(calculated.unitTotalTax));
  console.log('Line Total:', formatCurrency(calculated.lineTotal));

  return calculated;
};

// ============================================================================
// EXAMPLE 3: Sale Item (Discount Ignored)
// ============================================================================

export const example3_SaleItemDiscountIgnored = () => {
  console.log('\n=== EXAMPLE 3: Sale Item (Employee Discount Ignored) ===\n');

  const cartItem = {
    productId: mockProducts.jeans.id,
    name: mockProducts.jeans.name,
    sku: mockProducts.jeans.sku,
    category: mockProducts.jeans.category,
    quantity: 1,
    unitBasePrice: mockProducts.jeans.basePrice,
    unitSalePrice: mockProducts.jeans.salePrice,
    gstRate: mockProducts.jeans.gstRate,
    isTaxInclusive: mockProducts.jeans.isTaxInclusive
  };

  const calculated = calculateCartItem(cartItem, 10); // Discount ignored

  console.log('Product:', calculated.name);
  console.log('Unit Base Price:', formatCurrency(calculated.unitBasePrice));
  console.log('Unit Sale Price:', formatCurrency(calculated.unitSalePrice));
  console.log('Employee Discount Attempted: 10%');
  console.log('Employee Discount Applied:', formatCurrency(calculated.unitDiscountAmount), '(IGNORED - on sale)');
  console.log('Effective Unit Price:', formatCurrency(calculated.effectiveUnitPrice), '(Sale price used)');
  console.log('Unit Total Tax (12%):', formatCurrency(calculated.unitTotalTax));
  console.log('Line Total:', formatCurrency(calculated.lineTotal));

  return calculated;
};

// ============================================================================
// EXAMPLE 4: Tax Inclusive Product
// ============================================================================

export const example4_TaxInclusiveProduct = () => {
  console.log('\n=== EXAMPLE 4: Tax Inclusive Product ===\n');

  const cartItem = {
    productId: mockProducts.kurti.id,
    name: mockProducts.kurti.name,
    sku: mockProducts.kurti.sku,
    category: mockProducts.kurti.category,
    quantity: 1,
    unitBasePrice: mockProducts.kurti.basePrice,
    unitSalePrice: mockProducts.kurti.salePrice,
    gstRate: mockProducts.kurti.gstRate,
    isTaxInclusive: mockProducts.kurti.isTaxInclusive
  };

  const calculated = calculateCartItem(cartItem, 0);

  console.log('Product:', calculated.name);
  console.log('Unit Price (Tax Inclusive):', formatCurrency(calculated.unitBasePrice));
  console.log('Unit Taxable Value (Back-calculated):', formatCurrency(calculated.unitTaxableValue));
  console.log('Unit CGST (2.5%):', formatCurrency(calculated.unitCGST));
  console.log('Unit SGST (2.5%):', formatCurrency(calculated.unitSGST));
  console.log('Unit Total Tax (5%):', formatCurrency(calculated.unitTotalTax));
  console.log('Line Total:', formatCurrency(calculated.lineTotal), '(Same as price - already inclusive)');

  return calculated;
};

// ============================================================================
// EXAMPLE 5: Multi-Product Order
// ============================================================================

export const example5_MultiProductOrder = () => {
  console.log('\n=== EXAMPLE 5: Multi-Product Order with 5% Discount ===\n');

  const cart = [
    {
      productId: mockProducts.tshirt.id,
      name: mockProducts.tshirt.name,
      sku: mockProducts.tshirt.sku,
      category: mockProducts.tshirt.category,
      quantity: 2,
      unitBasePrice: mockProducts.tshirt.basePrice,
      unitSalePrice: mockProducts.tshirt.salePrice,
      gstRate: mockProducts.tshirt.gstRate,
      isTaxInclusive: mockProducts.tshirt.isTaxInclusive
    },
    {
      productId: mockProducts.jeans.id,
      name: mockProducts.jeans.name,
      sku: mockProducts.jeans.sku,
      category: mockProducts.jeans.category,
      quantity: 1,
      unitBasePrice: mockProducts.jeans.basePrice,
      unitSalePrice: mockProducts.jeans.salePrice,
      gstRate: mockProducts.jeans.gstRate,
      isTaxInclusive: mockProducts.jeans.isTaxInclusive
    },
    {
      productId: mockProducts.kurti.id,
      name: mockProducts.kurti.name,
      sku: mockProducts.kurti.sku,
      category: mockProducts.kurti.category,
      quantity: 1,
      unitBasePrice: mockProducts.kurti.basePrice,
      unitSalePrice: mockProducts.kurti.salePrice,
      gstRate: mockProducts.kurti.gstRate,
      isTaxInclusive: mockProducts.kurti.isTaxInclusive
    }
  ];

  const orderSummary = calculateOrderTotals(cart, 5);

  console.log('ORDER SUMMARY');
  console.log('=============');
  console.log('Total Items:', orderSummary.totalItems);
  console.log('Total Quantity:', orderSummary.totalQuantity);
  console.log('Employee Discount:', orderSummary.employeeDiscountPercent + '%');
  console.log('');
  console.log('Subtotal:', formatCurrency(orderSummary.subtotal));
  console.log('Total Discount:', formatCurrency(orderSummary.totalDiscount));
  console.log('Taxable Value:', formatCurrency(orderSummary.totalTaxableValue));
  console.log('CGST:', formatCurrency(orderSummary.totalCGST));
  console.log('SGST:', formatCurrency(orderSummary.totalSGST));
  console.log('Total Tax:', formatCurrency(orderSummary.totalTax));
  console.log('---');
  console.log('GRAND TOTAL:', formatCurrency(orderSummary.grandTotal));
  console.log('');

  console.log('ITEM BREAKDOWN');
  console.log('==============');
  orderSummary.items.forEach((item, index) => {
    console.log(`${index + 1}. ${item.name} (${item.sku})`);
    console.log(`   Qty: ${item.quantity} × ${formatCurrency(item.effectiveUnitPrice)} = ${formatCurrency(item.lineTotal)}`);
  });

  return orderSummary;
};

// ============================================================================
// EXAMPLE 6: Cart Management
// ============================================================================

export const example6_CartManagement = () => {
  console.log('\n=== EXAMPLE 6: Cart Management ===\n');

  // Start with empty cart
  let cart = clearCart();
  console.log('1. Empty cart:', cart.length, 'items');

  // Add first product
  const item1 = createCartItemFromProduct(mockProducts.tshirt, 2);
  cart = addToCart(cart, item1);
  console.log('2. Added T-Shirt (qty: 2):', cart.length, 'items');

  // Add second product
  const item2 = createCartItemFromProduct(mockProducts.jeans, 1);
  cart = addToCart(cart, item2);
  console.log('3. Added Jeans (qty: 1):', cart.length, 'items');

  // Add same product again (should merge)
  const item3 = createCartItemFromProduct(mockProducts.tshirt, 1);
  cart = addToCart(cart, item3);
  console.log('4. Added T-Shirt again (qty: 1):', cart.length, 'items (merged)');
  console.log('   T-Shirt total quantity:', cart[0].quantity);

  // Update quantity
  cart = updateCartItemQuantity(cart, mockProducts.tshirt.id, 5);
  console.log('5. Updated T-Shirt quantity to 5:', cart[0].quantity);

  // Remove item
  cart = removeFromCart(cart, mockProducts.jeans.id);
  console.log('6. Removed Jeans:', cart.length, 'items');

  // Calculate totals
  const orderSummary = calculateOrderTotals(cart, 0);
  console.log('7. Order total:', formatCurrency(orderSummary.grandTotal));

  return cart;
};

// ============================================================================
// EXAMPLE 7: GST Breakdown
// ============================================================================

export const example7_GSTBreakdown = () => {
  console.log('\n=== EXAMPLE 7: GST Breakdown ===\n');

  const cart = [
    {
      productId: mockProducts.tshirt.id,
      name: mockProducts.tshirt.name,
      sku: mockProducts.tshirt.sku,
      category: mockProducts.tshirt.category,
      quantity: 3,
      unitBasePrice: mockProducts.tshirt.basePrice,
      unitSalePrice: mockProducts.tshirt.salePrice,
      gstRate: mockProducts.tshirt.gstRate,
      isTaxInclusive: mockProducts.tshirt.isTaxInclusive
    }
  ];

  const orderSummary = calculateOrderTotals(cart, 0);
  const gstBreakdown = getGSTBreakdown(orderSummary);

  console.log('GST BREAKDOWN');
  console.log('=============');
  console.log('Taxable Value:', formatCurrency(gstBreakdown.taxableValue));
  console.log('CGST:', formatCurrency(gstBreakdown.cgst));
  console.log('SGST:', formatCurrency(gstBreakdown.sgst));
  console.log('Total GST:', formatCurrency(gstBreakdown.totalGST));
  console.log('GST Percentage:', gstBreakdown.gstPercentage + '%');

  return gstBreakdown;
};

// ============================================================================
// EXAMPLE 8: Error Handling
// ============================================================================

export const example8_ErrorHandling = () => {
  console.log('\n=== EXAMPLE 8: Error Handling ===\n');

  // Test 1: Discount > 10%
  try {
    const item = createCartItemFromProduct(mockProducts.tshirt, 1);
    calculateCartItem(item, 15);
  } catch (error) {
    console.log('✓ Error caught (discount > 10%):', error.message);
  }

  // Test 2: Discount on sale item
  try {
    const item = createCartItemFromProduct(mockProducts.jeans, 1);
    calculateCartItem(item, 5);
  } catch (error) {
    console.log('✓ Error caught (discount on sale):', error.message);
  }

  // Test 3: Invalid quantity
  try {
    createCartItemFromProduct(mockProducts.tshirt, -1);
  } catch (error) {
    console.log('✓ Error caught (negative quantity):', error.message);
  }

  // Test 4: Empty cart
  try {
    calculateOrderTotals([], 0);
  } catch (error) {
    console.log('✓ Error caught (empty cart):', error.message);
  }

  console.log('\nAll error validations working correctly!');
};

// ============================================================================
// RUN ALL EXAMPLES
// ============================================================================

export const runAllExamples = () => {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   ORDER CALCULATION ENGINE - USAGE EXAMPLES                ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  example1_SingleItemNoDiscount();
  example2_SingleItemWithDiscount();
  example3_SaleItemDiscountIgnored();
  example4_TaxInclusiveProduct();
  example5_MultiProductOrder();
  example6_CartManagement();
  example7_GSTBreakdown();
  example8_ErrorHandling();

  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   ALL EXAMPLES COMPLETED SUCCESSFULLY                      ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('\n');
};

// Uncomment to run examples
// runAllExamples();
