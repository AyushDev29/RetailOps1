# Product & Pricing Data Model

## Overview
This document defines the product data model, business rules, and access controls for the Clothing Brand Management System.

## Product Schema

### Required Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `name` | string | Required, non-empty | Product display name |
| `sku` | string | Required, unique, uppercase | Stock Keeping Unit identifier |
| `category` | string | Required, enum: 'men', 'women', 'kids' | Product category |
| `subcategory` | string | Required, non-empty | Product subcategory (e.g., 'Tshirt', 'Jeans') |
| `basePrice` | number | Required, > 0 | Base price (GST-exclusive) |
| `gstRate` | number | Required, enum: 5, 12, 18 | GST rate percentage |
| `isTaxInclusive` | boolean | Required | Whether displayed price includes tax |
| `isOnSale` | boolean | Required | Whether product is currently on sale |
| `salePrice` | number \| null | Must be < basePrice if set | Discounted price when on sale |
| `stockQty` | number | Required, >= 0 | Current stock quantity |
| `lowStockThreshold` | number | Required, >= 0 | Alert threshold for low stock |
| `isActive` | boolean | Required | Whether product is active/visible |
| `createdAt` | Timestamp | Auto-generated | Creation timestamp |
| `updatedAt` | Timestamp | Auto-generated | Last update timestamp |

## Business Rules

### 1. Sale Price Validation
**CRITICAL RULE**: Sale price MUST always be lower than base price.

```javascript
// ✅ Valid
{ basePrice: 1000, salePrice: 800, isOnSale: true }

// ❌ Invalid
{ basePrice: 1000, salePrice: 1200, isOnSale: true }
{ basePrice: 1000, salePrice: 1000, isOnSale: true }
```

### 2. Sale Status Consistency
- If `isOnSale` is `true`, `salePrice` MUST be set
- If `isOnSale` is `false`, `salePrice` SHOULD be `null`

```javascript
// ✅ Valid
{ isOnSale: true, salePrice: 800 }
{ isOnSale: false, salePrice: null }

// ❌ Invalid
{ isOnSale: true, salePrice: null }
```

### 3. SKU Uniqueness
- SKU must be unique across all products
- SKU is automatically converted to uppercase
- Validation happens at service layer before write

### 4. Stock Management
- Stock quantity cannot be negative
- Low stock threshold cannot be negative
- Stock updates are owner-only operations

### 5. Category Validation
- Only three categories allowed: 'men', 'women', 'kids'
- Enforced at both service layer and Firestore rules

### 6. GST Rate Validation
- Only three GST rates allowed: 5%, 12%, 18%
- Enforced at both service layer and Firestore rules

## Role-Based Access Control

### Employee Access (Read-Only)
Employees can:
- ✅ Read active products only (`isActive: true`)
- ✅ View all product fields (for order creation)
- ❌ Cannot create products
- ❌ Cannot update products
- ❌ Cannot modify pricing
- ❌ Cannot modify stock
- ❌ Cannot see inactive products

### Owner Access (Full CRUD)
Owners can:
- ✅ Read all products (including inactive)
- ✅ Create new products
- ✅ Update all product fields
- ✅ Set and modify pricing
- ✅ Set and modify GST rates
- ✅ Enable/disable sales
- ✅ Update stock quantities
- ✅ Activate/deactivate products
- ❌ Cannot delete products (soft delete via `isActive`)

## Service Layer Functions

### Employee-Safe Functions
```javascript
// Returns only active products with approved fields
getActiveProducts()
getProductsByCategory(category)
getProductById(productId)
```

### Owner-Only Functions
```javascript
// Full CRUD operations with validation
getAllProducts()
getProductByIdOwner(productId)
createProduct(productData)
updateProduct(productId, updates)
toggleProductActive(productId, isActive)
updateProductStock(productId, newStockQty)
```

## Validation Flow

### Create Product
1. Validate all required fields present
2. Validate data types and constraints
3. Check SKU uniqueness
4. Validate sale price < base price (if on sale)
5. Validate GST rate (5, 12, or 18)
6. Validate category (men, women, kids)
7. Create product document with timestamps

### Update Product
1. Validate updated fields (partial validation)
2. Check SKU uniqueness (if SKU changed)
3. Validate sale price < base price (if changed)
4. Validate sale status consistency
5. Update product document with new timestamp

## Firestore Security Rules

### Product Collection Rules
```
- Employees: Read-only access to active products
- Owners: Full CRUD access
- Sale price validation enforced at database level
- Required fields validation enforced at database level
- No one can delete products (soft delete only)
```

### Key Security Features
1. **Role verification**: All operations verify user role from users collection
2. **Active user check**: Only active users can perform operations
3. **Field validation**: Data types and constraints enforced at database level
4. **Business rule enforcement**: Sale price validation in security rules
5. **Immutable audit trail**: createdAt cannot be modified

## Migration Notes

### Existing Products
If you have existing products with old schema:
1. They will continue to work for read operations
2. Update operations will require new schema compliance
3. Consider running a migration script to add missing fields:
   - `sku` (generate from name or ID)
   - `subcategory` (default to category)
   - `gstRate` (default to 18)
   - `isTaxInclusive` (default to false)
   - `isOnSale` (default to false)
   - `salePrice` (default to null)
   - `stockQty` (default to 0)
   - `lowStockThreshold` (default to 10)
   - Rename `active` to `isActive`

### Breaking Changes
- `active` field renamed to `isActive`
- Products without `isActive: true` won't appear in employee queries
- All new products must include complete schema

## Example Product Document

```javascript
{
  name: "Classic Cotton T-Shirt",
  sku: "MEN-TSH-001",
  category: "men",
  subcategory: "Tshirt",
  basePrice: 999,
  gstRate: 12,
  isTaxInclusive: false,
  isOnSale: true,
  salePrice: 799,
  stockQty: 150,
  lowStockThreshold: 20,
  isActive: true,
  createdAt: Timestamp(2024-01-15 10:30:00),
  updatedAt: Timestamp(2024-01-20 14:45:00)
}
```

## Future Considerations

### Phase 2: Cart & Billing
- Effective price calculation (base vs sale)
- GST calculation based on `gstRate` and `isTaxInclusive`
- Stock deduction on order completion
- Low stock alerts

### Phase 3: Inventory Management
- Stock history tracking
- Reorder point automation
- Supplier management
- Purchase orders

### Phase 4: Advanced Pricing
- Bulk pricing tiers
- Customer-specific pricing
- Seasonal pricing rules
- Dynamic pricing

## Testing Checklist

- [ ] Create product with valid data
- [ ] Create product with invalid sale price (>= base price) - should fail
- [ ] Create product with duplicate SKU - should fail
- [ ] Create product with invalid GST rate - should fail
- [ ] Create product with invalid category - should fail
- [ ] Update product sale price to valid value
- [ ] Update product sale price to invalid value - should fail
- [ ] Toggle product on sale without setting sale price - should fail
- [ ] Employee tries to create product - should fail (Firestore rules)
- [ ] Employee reads active products - should succeed
- [ ] Employee reads inactive products - should not see them
- [ ] Owner reads all products - should succeed
- [ ] Owner updates product - should succeed
- [ ] Update product stock to negative value - should fail
