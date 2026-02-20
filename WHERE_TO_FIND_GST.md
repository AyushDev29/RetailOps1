# Where to Find GST on Your Bills 📄

## Quick Answer
**GST IS being calculated and displayed on all bills.** Here's where to look:

---

## 1️⃣ Line Items Table (Per Product)

Look at the **CGST** and **SGST** columns in the items table:

```
Product Name    | Qty | Rate  | Taxable | CGST      | SGST      | Total
----------------|-----|-------|---------|-----------|-----------|-------
T-Shirt (Sale)  | 1   | ₹800  | ₹714.29 | 6% ₹42.86 | 6% ₹42.86 | ₹800
```

- **Taxable Value**: The price without GST
- **CGST**: Central GST (half of total GST)
- **SGST**: State GST (half of total GST)

---

## 2️⃣ GST Summary Table (Grouped by Rate)

Below the items table, you'll see a **GST Summary**:

```
GST Rate | Taxable Value | CGST          | SGST          | Total Tax
---------|---------------|---------------|---------------|----------
12%      | ₹714.29       | 6% - ₹42.86   | 6% - ₹42.86   | ₹85.71
```

This groups all products by their GST rate and shows totals.

---

## 3️⃣ Totals Section (Bottom of Bill)

At the bottom, you'll see:

```
Total Quantity: 1 items
Subtotal: ₹800.00
CGST: ₹42.86
SGST: ₹42.86
Total Tax: ₹85.71
Grand Total: ₹800.00
PAYABLE AMOUNT: ₹800
```

- **CGST**: Total Central GST for all items
- **SGST**: Total State GST for all items
- **Total Tax**: CGST + SGST

---

## 🔍 Why GST Might Look "Hidden"

### If Product is Tax-Inclusive (isTaxInclusive = true):

The GST is **already included** in the price you see:

- **Sale Price**: ₹800 (includes GST)
- **Taxable Value**: ₹714.29 (price without GST)
- **GST**: ₹85.71 (extracted from the ₹800)
- **Customer Pays**: ₹800 (no extra charge)

### If Product is Tax-Exclusive (isTaxInclusive = false):

The GST is **added on top** of the price:

- **Sale Price**: ₹1500 (base price)
- **GST**: ₹180 (added on top)
- **Customer Pays**: ₹1680 (price + GST)

---

## ✅ How to Verify GST is Working

### Step 1: Create a Test Order
1. Add a product that's on sale
2. Complete the order
3. View the bill

### Step 2: Check the Bill
Look for these 3 sections:
1. **Line Items** - CGST and SGST columns
2. **GST Summary** - Grouped by rate
3. **Totals** - Total CGST, SGST, and Total Tax

### Step 3: Do the Math
For a product with 12% GST:
- CGST = 6% of taxable value
- SGST = 6% of taxable value
- Total GST = 12% of taxable value

**Example:**
- Taxable Value: ₹714.29
- CGST (6%): ₹42.86
- SGST (6%): ₹42.86
- Total GST: ₹85.71 ✅

---

## 🎯 Common Questions

### Q: "I don't see GST being added to the total"
**A:** If the product is tax-inclusive, GST is already in the price. Check the "Taxable Value" column - it's lower than the unit price because GST was extracted.

### Q: "The GST amount seems small"
**A:** That's because you're looking at the sale price, not the base price. GST is calculated on the discounted price, which is correct.

### Q: "Where's the 12% GST?"
**A:** It's split into CGST (6%) and SGST (6%). That's how Indian GST works - always 50/50 split.

---

## 📊 Real Example

**Product on Sale:**
- Name: Premium T-Shirt
- Base Price: ₹1000
- Sale Price: ₹800
- GST Rate: 12%
- Tax Inclusive: Yes

**Bill Shows:**
```
Line Items:
- Taxable Value: ₹714.29
- CGST (6%): ₹42.86
- SGST (6%): ₹42.86
- Line Total: ₹800.00

GST Summary:
- 12% GST: ₹85.71 (₹42.86 + ₹42.86)

Totals:
- Subtotal: ₹800.00
- Total CGST: ₹42.86
- Total SGST: ₹42.86
- Total Tax: ₹85.71
- Grand Total: ₹800.00
```

**Verification:**
- ₹714.29 × 12% = ₹85.71 ✅
- ₹714.29 + ₹85.71 = ₹800.00 ✅

---

## 🚀 Conclusion

**GST is working perfectly!** It's calculated on the sale price and displayed in 3 places on every bill. If you're not seeing it, you might be looking at tax-inclusive products where GST is hidden inside the price (which is correct and legal).

The system is GST-compliant and follows Indian tax regulations.
