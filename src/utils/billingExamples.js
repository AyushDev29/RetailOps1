/**
 * BILLING SERVICE EXAMPLES
 * ========================
 * Demonstrates bill generation from order calculation output
 */

import { generateBill, formatBillForDisplay, getGSTSummary, validateBill } from '../services/billingService';
import { calculateOrder } from '../services/orderCalculationService';

// ============================================================================
// EXAMPLE 1: Simple Store Sale Bill
// ============================================================================

export const example1_SimpleStoreSale = () => {
  console.log('\n=== EXAMPLE 1: Simple Store Sale ===\n');
  
  // Step 1: Create cart (from Step 2)
  const cart = {
    items: [
      {
        productId: 'prod_001',
        name: 'Classic Cotton T-Shirt',
        sku: 'MEN-TSH-001',
        category: 'men',
        quantity: 2,
        basePrice: 999,
        salePrice: null,
        gstRate: 12,
        isTaxInclusive: false,
        isOnSale: false
      }
    ],
    employeeDiscount: 0
  };
  
  // Step 2: Calculate order (from Step 2)
  const orderCalculation = calculateOrder(cart);
  console.log('Order Calculation:', JSON.stringify(orderCalculation, null, 2));
  
  // Step 3: Generate bill
  const bill = generateBill(orderCalculation, {
    orderId: 'order_12345',
    orderType: 'store',
    employeeId: 'emp_001',
    employeeName: 'Ayush Navale',
    exhibitionId: null,
    customer: {
      name: 'Rajesh Kumar',
      phone: '+91-9876543210',
      address: 'Mumbai, Maharashtra'
    }
  });
  
  console.log('\nGenerated Bill:', JSON.stringify(bill, null, 2));
  
  // Validate bill
  const validation = validateBill(bill);
  console.log('\nValidation:', validation);
  
  // Get GST summary
  const gstSummary = getGSTSummary(bill);
  console.log('\nGST Summary:', JSON.stringify(gstSummary, null, 2));
  
  return bill;
};

// ============================================================================
// EXAMPLE 2: Exhibition Sale with Multiple Items
// ============================================================================

export const example2_ExhibitionSaleMultipleItems = () => {
  console.log('\n=== EXAMPLE 2: Exhibition Sale with Multiple Items ===\n');
  
  const cart = {
    items: [
      {
        productId: 'prod_002',
        name: 'Designer Saree',
        sku: 'WMN-SAR-001',
        category: 'women',
        quantity: 1,
        basePrice: 4999,
        salePrice: null,
        gstRate: 5,
        isTaxInclusive: false,
        isOnSale: false
      },
      {
        productId: 'prod_003',
        name: 'Casual Kurti',
        sku: 'WMN-KRT-001',
        category: 'women',
        quantity: 2,
        basePrice: 1499,
        salePrice: 1199,
        gstRate: 12,
        isTaxInclusive: false,
        isOnSale: true
      }
    ],
    employeeDiscount: 0
  };
  
  const orderCalculation = calculateOrder(cart);
  
  const bill = generateBill(orderCalculation, {
    orderId: 'order_12346',
    orderType: 'exhibition',
    employeeId: 'emp_001',
    employeeName: 'Ayush Navale',
    exhibitionId: 'exh_001',
    customer: {
      name: 'Priya Sharma',
      phone: '+91-9876543211',
      address: 'Pune, Maharashtra'
    }
  });
  
  console.log('Generated Bill:', JSON.stringify(bill, null, 2));
  
  const gstSummary = getGSTSummary(bill);
  console.log('\nGST Summary (Multiple Rates):', JSON.stringify(gstSummary, null, 2));
  
  return bill;
};

// ============================================================================
// EXAMPLE 3: Pre-Booking with Employee Discount
// ============================================================================

export const example3_PreBookingWithDiscount = () => {
  console.log('\n=== EXAMPLE 3: Pre-Booking with Employee Discount ===\n');
  
  const cart = {
    items: [
      {
        productId: 'prod_004',
        name: 'Slim Fit Jeans',
        sku: 'MEN-JNS-001',
        category: 'men',
        quantity: 1,
        basePrice: 2499,
        salePrice: null,
        gstRate: 12,
        isTaxInclusive: false,
        isOnSale: false
      }
    ],
    employeeDiscount: 10 // 10% employee discount
  };
  
  const orderCalculation = calculateOrder(cart);
  
  const bill = generateBill(orderCalculation, {
    orderId: 'order_12347',
    orderType: 'prebooking',
    employeeId: 'emp_002',
    employeeName: 'Kedar Patil',
    exhibitionId: null,
    customer: {
      name: 'Amit Verma',
      phone: '+91-9876543212',
      address: ''
    }
  });
  
  console.log('Generated Bill:', JSON.stringify(bill, null, 2));
  
  return bill;
};

// ============================================================================
// EXAMPLE 4: Tax Inclusive Product
// ============================================================================

export const example4_TaxInclusiveProduct = () => {
  console.log('\n=== EXAMPLE 4: Tax Inclusive Product ===\n');
  
  const cart = {
    items: [
      {
        productId: 'prod_005',
        name: 'Kids Party Dress',
        sku: 'KID-DRS-001',
        category: 'kids',
        quantity: 1,
        basePrice: 1999,
        salePrice: 1599,
        gstRate: 12,
        isTaxInclusive: true, // Price includes tax
        isOnSale: true
      }
    ],
    employeeDiscount: 0
  };
  
  const orderCalculation = calculateOrder(cart);
  
  const bill = generateBill(orderCalculation, {
    orderId: 'order_12348',
    orderType: 'store',
    employeeId: 'emp_001',
    employeeName: 'Ayush Navale',
    exhibitionId: null,
    customer: {
      name: 'Sneha Desai',
      phone: '+91-9876543213',
      address: 'Nagpur, Maharashtra'
    }
  });
  
  console.log('Generated Bill:', JSON.stringify(bill, null, 2));
  
  return bill;
};

// ============================================================================
// EXAMPLE 5: Formatted Bill for Display
// ============================================================================

export const example5_FormattedBillDisplay = () => {
  console.log('\n=== EXAMPLE 5: Formatted Bill for Display ===\n');
  
  const cart = {
    items: [
      {
        productId: 'prod_001',
        name: 'Classic Cotton T-Shirt',
        sku: 'MEN-TSH-001',
        category: 'men',
        quantity: 3,
        basePrice: 999,
        salePrice: null,
        gstRate: 12,
        isTaxInclusive: false,
        isOnSale: false
      }
    ],
    employeeDiscount: 5
  };
  
  const orderCalculation = calculateOrder(cart);
  
  const bill = generateBill(orderCalculation, {
    orderId: 'order_12349',
    orderType: 'store',
    employeeId: 'emp_001',
    employeeName: 'Ayush Navale',
    exhibitionId: null,
    customer: {
      name: 'Vikram Singh',
      phone: '+91-9876543214',
      address: 'Delhi'
    }
  });
  
  // Format for display
  const formattedBill = formatBillForDisplay(bill);
  
  console.log('Formatted Bill (Display-Ready):', JSON.stringify(formattedBill, null, 2));
  
  return formattedBill;
};

// ============================================================================
// EXAMPLE 6: Complete Bill with All Fields
// ============================================================================

export const example6_CompleteBillStructure = () => {
  console.log('\n=== EXAMPLE 6: Complete Bill Structure (Reference) ===\n');
  
  const sampleBill = {
    billNumber: 'BILL-20260210-143025-456',
    billDate: '2026-02-10T14:30:25.000Z',
    orderId: 'order_sample',
    orderType: 'store',
    employeeId: 'emp_001',
    employeeName: 'Ayush Navale',
    exhibitionId: null,
    
    seller: {
      businessName: 'Kamdon Fashion',
      gstin: 'GSTIN_PLACEHOLDER',
      storeAddress: 'Store Address Line 1, City, State',
      stateCode: '27',
      phone: '+91-XXXXXXXXXX',
      email: 'contact@kamdonfashion.com'
    },
    
    customer: {
      name: 'Sample Customer',
      phone: '+91-9876543210',
      address: 'Customer Address'
    },
    
    lineItems: [
      {
        sku: 'MEN-TSH-001',
        productName: 'Classic Cotton T-Shirt',
        category: 'men',
        quantity: 2,
        unitPrice: 999.00,
        discountApplied: 0,
        taxableValue: 1998.00,
        cgstRate: 6,
        cgstAmount: 119.88,
        sgstRate: 6,
        sgstAmount: 119.88,
        lineTotal: 2237.76
      }
    ],
    
    totals: {
      totalQuantity: 2,
      subtotal: 1998.00,
      totalDiscount: 0,
      totalCGST: 119.88,
      totalSGST: 119.88,
      totalTax: 239.76,
      grandTotal: 2237.76,
      roundedOffAmount: 0.24,
      payableAmount: 2238.00
    },
    
    footer: {
      paymentMode: 'CASH',
      notes: ''
    },
    
    generatedAt: '2026-02-10T14:30:25.000Z'
  };
  
  console.log('Complete Bill Structure:', JSON.stringify(sampleBill, null, 2));
  
  return sampleBill;
};

// ============================================================================
// RUN ALL EXAMPLES
// ============================================================================

export const runAllBillingExamples = () => {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║         BILLING SERVICE - USAGE EXAMPLES                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  try {
    example1_SimpleStoreSale();
    example2_ExhibitionSaleMultipleItems();
    example3_PreBookingWithDiscount();
    example4_TaxInclusiveProduct();
    example5_FormattedBillDisplay();
    example6_CompleteBillStructure();
    
    console.log('\n✅ All billing examples executed successfully!\n');
  } catch (error) {
    console.error('\n❌ Error running examples:', error.message);
    console.error(error);
  }
};
