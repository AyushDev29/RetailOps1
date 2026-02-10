# Order Calculation Engine Documentation

## Overview
Government-compliant GST calculation engine with role-safe discount enforcement for multi-product orders.

## Core Principles

### 1. Employee Cannot Control
- ❌ GST rate
- ❌ Tax amount
- ❌ Sale price
- ✅ Only quantity and employee discount (max 10%)

### 2. Calculation Rules
- All calculations are deterministic and reproducible
- GST = CGST + SGST (50/50 split)
- Valid GST rates: 5%, 12%, 18%
- Employee discount max: 10%
- Sale price overrides all discounts

### 3. Tax Calculation
- **Tax Inclusive**: Back-calculate taxable value
- **Tax Exclusive**: Add GST on top of price

## Cart Item Structure

### Input (Product Snapshot)
```javascript
{
  productId: "prod123",
  name: "Cotton T-Shirt",
  sku: "MEN-TSH-001",
  category: "men",
  quantity: 2,
  unitBasePrice: 1000,
  unitSalePrice: 800,  // null if not on sale
  gstRate: 12,
  isTaxInclusive: false
}
```

### Output (Calculated Item)
```javascript
{
  // Original data
  productId: "prod123",
  name: "Cotton T-Shirt",
  sku: "MEN-TSH-001",
  category: "men",
  quantity: 2,
  unitBasePrice: 1000,
  unitSalePrice: 800,
  gstRate: 12,
  isTaxInclusive: false,

  // Calculated per-unit values
  effectiveUnitPrice: 800,      // Sale price used
  unitDiscountAmount: 0,         // No discount on sale items
  unitTaxableValue: 800,
  unitCGST: 48,                  // 6% of 800
  unitSGST: 48,                  // 6% of 800
  unitTotalTax: 96,              // 12% of 800

  // Calculated line totals
  lineSubtotal: 1600,            // 800 × 2
  lineTaxableValue: 1600,
  lineDiscountAmount: 0,
  lineCGST: 96,                  // 48 × 2
  lineSGST: 96,                  // 48 × 2
  lineTotalTax: 192,             // 96 × 2
  lineTotal: 1792                // 1600 + 192
}
```

## Order Totals Structure

```javascript
{
  // Metadata
  totalItems: 3,
  totalQuantity: 5,
  employeeDiscountPercent: 5,

  // Calculated items array
  items: [...],

  // Order totals
  subtotal: 5000,
  totalDiscount: 250,
  totalTaxableValue: 4750,
  totalCGST: 285,
  totalSGST: 285,
  totalTax: 570,
  grandTotal: 5320
}
```

## API Reference

### Core Calculation Functions

#### `calculateCartItem(item, employeeDiscountPercent)`
Calculate all values for a single cart item.

**Parameters:**
- `item` (Object): Cart item with product snapshot
- `employeeDiscountPercent` (number): 0-10, default 0

**Returns:** Calculated cart item with all derived values

**Throws:**
- Invalid cart item structure
- Invalid GST rate
- Invalid discount (>10% or on sale items)
- Sale price >= base price

**Example:**
```javascript
import { calculateCartItem } from './services/orderCalculationService';

const item = {
  productId: "prod123",
  name: "Cotton T-Shirt",
  sku: "MEN-TSH-001",
  category: "men",
  quantity: 2,
  unitBasePrice: 1000,
  unitSalePrice: null,  // Not on sale
  gstRate: 12,
  isTaxInclusive: false
};

const calculated = calculateCartItem(item, 5); // 5% employee discount
// Result: effectiveUnitPrice = 950 (1000 - 5%)
```

#### `calculateOrderTotals(cartItems, employeeDiscountPercent)`
Calculate order totals from multiple cart items.

**Parameters:**
- `cartItems` (Array): Array of cart items
- `employeeDiscountPercent` (number): 0-10, default 0

**Returns:** Order summary with totals and calculated items

**Throws:**
- Empty cart
- Invalid discount percentage
- Negative grand total

**Example:**
```javascript
import { calculateOrderTotals } from './services/orderCalculationService';

const cart = [
  { /* item 1 */ },
  { /* item 2 */ },
  { /* item 3 */ }
];

const orderSummary = calculateOrderTotals(cart, 5);
console.log(orderSummary.grandTotal); // Final payable amount
```

### Cart Management Functions

#### `createCartItemFromProduct(product, quantity)`
Create cart item from product service data.

**Example:**
```javascript
import { createCartItemFromProduct } from './services/orderCalculationService';
import { getProductById } from './services/productService';

const product = await getProductById("prod123");
const cartItem = createCartItemFromProduct(product, 2);
```

#### `addToCart(cart, newItem)`
Add item to cart (merges if exists).

**Example:**
```javascript
import { addToCart } from './services/orderCalculationService';

let cart = [];
cart = addToCart(cart, cartItem1);
cart = addToCart(cart, cartItem2);
```

#### `updateCartItemQuantity(cart, productId, newQuantity)`
Update quantity of existing cart item.

**Example:**
```javascript
import { updateCartItemQuantity } from './services/orderCalculationService';

cart = updateCartItemQuantity(cart, "prod123", 5);
```

#### `removeFromCart(cart, productId)`
Remove item from cart.

**Example:**
```javascript
import { removeFromCart } from './services/orderCalculationService';

cart = removeFromCart(cart, "prod123");
```

#### `clearCart()`
Clear entire cart.

**Example:**
```javascript
import { clearCart } from './services/orderCalculationService';

cart = clearCart();
```

### Utility Functions

#### `formatCurrency(amount)`
Format amount as Indian currency.

**Example:**
```javascript
import { formatCurrency } from './services/orderCalculationService';

console.log(formatCurrency(1234.56)); // "₹1234.56"
```

#### `getGSTBreakdown(orderTotals)`
Get GST breakdown summary.

**Example:**
```javascript
import { getGSTBreakdown } from './services/orderCalculationService';

const breakdown = getGSTBreakdown(orderSummary);
console.log(breakdown);
// {
//   taxableValue: 4750,
//   cgst: 285,
//   sgst: 285,
//   totalGST: 570,
//   gstPercentage: "12.00"
// }
```

## Business Rules

### 1. Sale Price Override
```javascript
// Product on sale
const item = {
  unitBasePrice: 1000,
  unitSalePrice: 800,
  // ...
};

// Employee discount is IGNORED
calculateCartItem(item, 10); // effectivePrice = 800, not 900
```

### 2. Employee Discount Rules
```javascript
// Valid: Discount on regular price
calculateCartItem(regularItem, 5); // ✅ 5% discount applied

// Valid: No discount
calculateCartItem(regularItem, 0); // ✅ No discount

// Invalid: Discount > 10%
calculateCartItem(regularItem, 15); // ❌ Throws error

// Invalid: Discount on sale item
calculateCartItem(saleItem, 5); // ❌ Throws error
```

### 3. GST Calculation

#### Tax Exclusive (isTaxInclusive: false)
```javascript
const item = {
  unitBasePrice: 1000,
  gstRate: 12,
  isTaxInclusive: false
};

// Calculation:
// Taxable Value = 1000
// GST = 1000 × 12% = 120
// CGST = 60, SGST = 60
// Total = 1000 + 120 = 1120
```

#### Tax Inclusive (isTaxInclusive: true)
```javascript
const item = {
  unitBasePrice: 1120,
  gstRate: 12,
  isTaxInclusive: true
};

// Calculation:
// Taxable Value = 1120 / 1.12 = 1000
// GST = 1120 - 1000 = 120
// CGST = 60, SGST = 60
// Total = 1120 (already inclusive)
```

## Complete Usage Example

```javascript
import {
  createCartItemFromProduct,
  addToCart,
  calculateOrderTotals,
  formatCurrency,
  getGSTBreakdown
} from './services/orderCalculationService';
import { getProductById } from './services/productService';

// 1. Create cart
let cart = [];

// 2. Add products
const product1 = await getProductById("prod1");
const product2 = await getProductById("prod2");

cart = addToCart(cart, createCartItemFromProduct(product1, 2));
cart = addToCart(cart, createCartItemFromProduct(product2, 1));

// 3. Calculate order with 5% employee discount
const orderSummary = calculateOrderTotals(cart, 5);

// 4. Display results
console.log('Order Summary:');
console.log('Items:', orderSummary.totalItems);
console.log('Quantity:', orderSummary.totalQuantity);
console.log('Subtotal:', formatCurrency(orderSummary.subtotal));
console.log('Discount:', formatCurrency(orderSummary.totalDiscount));
console.log('CGST:', formatCurrency(orderSummary.totalCGST));
console.log('SGST:', formatCurrency(orderSummary.totalSGST));
console.log('Total Tax:', formatCurrency(orderSummary.totalTax));
console.log('Grand Total:', formatCurrency(orderSummary.grandTotal));

// 5. Get GST breakdown
const gstBreakdown = getGSTBreakdown(orderSummary);
console.log('GST Breakdown:', gstBreakdown);

// 6. Access individual items
orderSummary.items.forEach(item => {
  console.log(`${item.name}: ${formatCurrency(item.lineTotal)}`);
});
```

## Error Handling

All functions throw descriptive errors:

```javascript
try {
  const result = calculateCartItem(item, 15);
} catch (error) {
  console.error(error.message);
  // "Employee discount cannot exceed 10%"
}
```

Common errors:
- "Cart item validation failed: ..."
- "Employee discount cannot exceed 10%"
- "Employee discount cannot be applied to products on sale"
- "Invalid GST rate: X"
- "Sale price must be lower than base price"
- "Quantity must be a positive number"
- "Grand total cannot be negative"

## Testing Examples

### Test Case 1: Regular Product with Discount
```javascript
const item = {
  productId: "test1",
  name: "Test Product",
  sku: "TEST-001",
  category: "men",
  quantity: 1,
  unitBasePrice: 1000,
  unitSalePrice: null,
  gstRate: 12,
  isTaxInclusive: false
};

const result = calculateCartItem(item, 10);

// Expected:
// effectiveUnitPrice: 900 (1000 - 10%)
// unitTaxableValue: 900
// unitTotalTax: 108 (12% of 900)
// lineTotal: 1008
```

### Test Case 2: Sale Product (Discount Ignored)
```javascript
const item = {
  productId: "test2",
  name: "Sale Product",
  sku: "TEST-002",
  category: "women",
  quantity: 2,
  unitBasePrice: 2000,
  unitSalePrice: 1500,
  gstRate: 18,
  isTaxInclusive: false
};

const result = calculateCartItem(item, 10); // Discount ignored

// Expected:
// effectiveUnitPrice: 1500 (sale price)
// unitDiscountAmount: 0
// unitTotalTax: 270 (18% of 1500)
// lineTotal: 3540 (1500 + 270) × 2
```

### Test Case 3: Tax Inclusive Product
```javascript
const item = {
  productId: "test3",
  name: "Inclusive Product",
  sku: "TEST-003",
  category: "kids",
  quantity: 1,
  unitBasePrice: 1120,
  unitSalePrice: null,
  gstRate: 12,
  isTaxInclusive: true
};

const result = calculateCartItem(item, 0);

// Expected:
// effectiveUnitPrice: 1120
// unitTaxableValue: 1000 (back-calculated)
// unitTotalTax: 120
// lineTotal: 1120 (already inclusive)
```

## Integration Notes

### For Future UI Implementation
```javascript
// In component state
const [cart, setCart] = useState([]);
const [employeeDiscount, setEmployeeDiscount] = useState(0);

// Add to cart
const handleAddToCart = async (productId, quantity) => {
  const product = await getProductById(productId);
  const cartItem = createCartItemFromProduct(product, quantity);
  setCart(addToCart(cart, cartItem));
};

// Calculate on render
const orderSummary = useMemo(() => {
  if (cart.length === 0) return null;
  return calculateOrderTotals(cart, employeeDiscount);
}, [cart, employeeDiscount]);
```

### For Order Creation
```javascript
// When creating order in Firestore
const orderSummary = calculateOrderTotals(cart, employeeDiscount);

const orderData = {
  items: orderSummary.items,
  totals: {
    subtotal: orderSummary.subtotal,
    discount: orderSummary.totalDiscount,
    cgst: orderSummary.totalCGST,
    sgst: orderSummary.totalSGST,
    totalTax: orderSummary.totalTax,
    grandTotal: orderSummary.grandTotal
  },
  createdBy: userId,
  createdAt: serverTimestamp()
};
```

## Constants

```javascript
VALID_GST_RATES = [5, 12, 18]
MAX_EMPLOYEE_DISCOUNT_PERCENT = 10
GST_SPLIT_RATIO = 0.5 // CGST and SGST
```

## Future Enhancements (Out of Scope)

- Payment integration
- Inventory deduction
- Bill printing/PDF generation
- Order history
- Customer-specific pricing
- Bulk discounts
- Coupon codes

---

**Version:** 1.0  
**Last Updated:** February 2026  
**Status:** ✅ Production Ready
