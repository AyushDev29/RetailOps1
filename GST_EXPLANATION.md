# GST Calculation on Sale Products - VERIFIED ✅

## Summary
**GST IS being calculated correctly on products that are on sale.** The calculation engine applies GST to the sale price, not the base price.

## How It Works

### When a product is on sale:
1. The system uses the **sale price** (not base price) for GST calculation
2. GST is calculated based on the product's `gstRate` (5%, 12%, or 18%)
3. The calculation respects the `isTaxInclusive` flag

### Example Calculations:

#### Product on Sale (Tax Exclusive)
- Base Price: ₹2000
- Sale Price: ₹1500
- GST Rate: 12%
- Tax Inclusive: NO

**Calculation:**
- Taxable Value: ₹1500
- CGST (6%): ₹90
- SGST (6%): ₹90
- Total GST: ₹180
- **Final Price: ₹1680**

#### Product on Sale (Tax Inclusive)
- Base Price: ₹1000
- Sale Price: ₹800
- GST Rate: 12%
- Tax Inclusive: YES

**Calculation:**
- Taxable Value: ₹714.29 (back-calculated)
- CGST (6%): ₹42.86
- SGST (6%): ₹42.86
- Total GST: ₹85.71
- **Final Price: ₹800** (GST already included)

## Why You Might Not "See" GST

### Reason 1: Tax-Inclusive Products
If your product has `isTaxInclusive = true`, the GST is **hidden inside the price**. The customer pays the sale price, and GST is extracted from it.

**Example:**
- Sale Price: ₹800 (includes GST)
- Taxable Value: ₹714.29
- GST: ₹85.71 (already in the ₹800)

The bill will show:
- Taxable Value: ₹714.29
- CGST: ₹42.86
- SGST: ₹42.86
- Total: ₹800

### Reason 2: Looking at Wrong Section
GST is displayed in multiple places on the bill:
1. **Line Items Table** - Shows CGST and SGST for each product
2. **GST Summary Table** - Groups GST by rate
3. **Totals Section** - Shows total CGST, SGST, and Total Tax

## How to Verify GST is Working

### Step 1: Check Browser Console
When you create an order, the system logs detailed GST calculations:

```
[GST DEBUG] ========== Calculating Cart Item: T-Shirt ==========
[GST DEBUG] Base Price: ₹1000, Sale Price: ₹800, On Sale: true
[GST DEBUG] GST Rate: 12%, Tax Inclusive: true
[GST DEBUG] Product on sale - Using sale price: ₹800 (Base: ₹1000)
[GST DEBUG] Tax-inclusive calculation: Price ₹800 @ 12% = Taxable ₹714.29, Tax ₹85.71
[GST DEBUG] GST Split: CGST ₹42.86 + SGST ₹42.86 = Total ₹85.71
```

### Step 2: Check the Bill Preview
Look at the **GST Summary** section on the bill. It shows:
- GST Rate (5%, 12%, or 18%)
- Taxable Value
- CGST Amount
- SGST Amount
- Total Tax

### Step 3: Check Product Data in Firestore
Verify your product has:
- `gstRate`: 5, 12, or 18
- `isTaxInclusive`: true or false
- `isOnSale`: true
- `salePrice`: a number less than basePrice

## Common Misconceptions

### ❌ "GST is not applying"
**Reality:** GST IS applying. If `isTaxInclusive = true`, it's just hidden in the price.

### ❌ "GST should be added on top of sale price"
**Reality:** Only if `isTaxInclusive = false`. If true, GST is extracted from the sale price.

### ❌ "The bill doesn't show GST"
**Reality:** The bill shows GST in 3 places:
1. Line items (CGST/SGST columns)
2. GST Summary table
3. Totals section (Total CGST, Total SGST, Total Tax)

## Code Verification

The calculation is done in `src/services/orderCalculationService.js`:

```javascript
// Line 165: Uses sale price when product is on sale
if (isOnSale && salePrice !== null && salePrice !== undefined) {
  effectivePrice = salePrice;  // ✅ Sale price is used
  console.log(`Product on sale - Using sale price: ₹${salePrice}`);
}

// Line 180: GST is calculated on the effective price (sale price)
const gstCalculation = calculateGST(
  effectivePrice,  // ✅ This is the sale price
  item.gstRate,
  item.isTaxInclusive
);
```

## Test Results

Run `node test-gst-calculation.js` to see proof:

```
=== TEST 1: Product on Sale (Tax Inclusive) ===
Product: T-Shirt
Base Price: ₹1000
Sale Price: ₹800
GST Rate: 12%

GST Calculation on Sale Price (₹800):
Taxable Value: ₹714.29
CGST (6%): ₹42.86
SGST (6%): ₹42.86
Total GST: ₹85.71
✅ GST IS being calculated on sale price
```

## Conclusion

**The system is working correctly.** GST is being calculated on the sale price for products on sale. If you're not seeing it:

1. Check if `isTaxInclusive = true` (GST is hidden in price)
2. Look at the GST Summary section on the bill
3. Check browser console for debug logs
4. Verify product data in Firestore

The calculation engine is mathematically correct and complies with Indian GST regulations.
