# Critical Issue: Order Schema Design Problem

## Problem Identified

When a customer buys multiple products in ONE sale, the system creates **multiple separate order documents** instead of **ONE order with multiple line items**.

### Current Behavior (WRONG):
```
Customer: 09867457746
Sale 1:
  - Order 1: Kids Denim Shorts (₹899)
  - Order 2: Kids Cotton T-Shirt (₹449)
```

This creates 2 separate orders in Firestore, which is incorrect.

### Expected Behavior (CORRECT):
```
Customer: 09867457746
Sale 1:
  - Order 1: 
    - Item 1: Kids Denim Shorts (₹899)
    - Item 2: Kids Cotton T-Shirt (₹449)
    - Total: ₹1348
```

This should create 1 order with 2 line items.

## Root Cause

### Current Order Schema (WRONG):
```javascript
{
  type: 'daily',
  customerPhone: '09867457746',
  productId: 'product123',  // ❌ Only ONE product
  price: 899,
  quantity: 1,
  status: 'completed',
  createdBy: 'employeeId',
  createdAt: timestamp
}
```

### Current Code (WRONG):
```javascript
// Creates ONE order per product
for (const cartItem of cart) {
  const orderData = {
    productId: cartItem.productId,  // ❌ One product per order
    price: cartItem.price,
    quantity: cartItem.quantity
  };
  await createOrder(orderData);  // ❌ Multiple orders created
}
```

## Correct Solution

### New Order Schema (CORRECT):
```javascript
{
  type: 'daily',
  customerPhone: '09867457746',
  items: [  // ✅ Array of items
    {
      productId: 'product123',
      productName: 'Kids Denim Shorts',
      sku: 'KDS-DEN-002',
      quantity: 1,
      unitPrice: 899,
      lineTotal: 899
    },
    {
      productId: 'product456',
      productName: 'Kids Cotton T-Shirt',
      sku: 'KCT-COT-001',
      quantity: 1,
      unitPrice: 449,
      lineTotal: 449
    }
  ],
  totals: {  // ✅ Order-level totals
    subtotal: 1348,
    totalCGST: 80.88,
    totalSGST: 80.88,
    totalTax: 161.76,
    grandTotal: 1509.76,
    payableAmount: 1510
  },
  status: 'completed',
  createdBy: 'employeeId',
  createdAt: timestamp,
  billId: 'BILL-260210-5757'  // ✅ Link to bill
}
```

### New Code (CORRECT):
```javascript
// Create ONE order with multiple items
const orderData = {
  type: finalOrderType,
  customerPhone: formData.customerPhone,
  items: cart.map(item => ({  // ✅ All items in one order
    productId: item.productId,
    productName: item.name,
    sku: item.sku,
    quantity: item.quantity,
    unitPrice: item.unitSalePrice || item.unitBasePrice,
    lineTotal: (item.unitSalePrice || item.unitBasePrice) * item.quantity
  })),
  totals: orderCalculation.summary,  // ✅ Order totals
  status: orderType === 'prebooking' ? 'pending' : 'completed',
  exhibitionId,
  createdBy: user.uid,
  billId: bill.billNumber,  // ✅ Link to bill
  createdAt: serverTimestamp()
};

const createdOrder = await createOrder(orderData);  // ✅ ONE order created
```

## Impact

### Current Issues:
1. ❌ Multiple orders for one sale
2. ❌ Owner sees duplicate entries
3. ❌ Analytics count wrong (2 orders instead of 1)
4. ❌ Inventory deducted multiple times
5. ❌ Cannot link bill to order properly
6. ❌ Pre-booking conversion broken

### After Fix:
1. ✅ One order per sale
2. ✅ Owner sees one entry with all items
3. ✅ Analytics count correct
4. ✅ Inventory deducted once per sale
5. ✅ Bill linked to order via billId
6. ✅ Pre-booking conversion works

## Files That Need Changes

### 1. Order Service (`src/services/orderService.js`)
- Update `createOrder` to accept items array
- Update validation to check items array
- Update inventory deduction to handle multiple items

### 2. Employee Dashboard (`src/pages/dashboard/EmployeeDashboard.jsx`)
- Change from loop creating multiple orders
- Create ONE order with items array
- Link billId to order

### 3. Owner Dashboard (`src/pages/owner/OwnerDashboard.jsx`)
- Update orders table to show items count
- Update View Bill to handle items array
- Show expandable row for multiple items

### 4. Firestore Rules (`firestore.rules`)
- Update validation for items array
- Ensure items array is not empty

### 5. Analytics Service (`src/services/analyticsService.js`)
- Update to count orders correctly
- Calculate revenue from totals field

## Migration Strategy

### Option 1: Breaking Change (Recommended)
1. Delete all existing orders (they're test data)
2. Deploy new schema
3. Start fresh with correct structure

### Option 2: Gradual Migration
1. Support both old and new schema
2. Migrate old orders to new schema
3. Remove old schema support later

## Recommendation

**Use Option 1 (Breaking Change)** because:
- Currently in development/testing phase
- No production data to preserve
- Cleaner implementation
- Faster to deploy

## Next Steps

1. Update order schema in orderService
2. Update Employee Dashboard order creation
3. Update Owner Dashboard order display
4. Update Firestore rules
5. Test thoroughly
6. Deploy

## Time Estimate

- Schema update: 30 minutes
- Dashboard updates: 45 minutes
- Testing: 30 minutes
- **Total: ~2 hours**

## Priority

**CRITICAL** - This affects core business logic and data integrity.
