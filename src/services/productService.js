import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc,
  query,
  where,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from './firebase';

/**
 * PRODUCT SCHEMA (PRD-COMPLIANT)
 * ================================
 * name: string (required)
 * sku: string (required, unique)
 * category: 'men' | 'women' | 'kids' (required)
 * subcategory: string (required)
 * basePrice: number (required, GST-exclusive)
 * gstRate: 5 | 12 | 18 (required)
 * isTaxInclusive: boolean (required)
 * isOnSale: boolean (required)
 * salePrice: number | null (must be < basePrice if set)
 * stockQty: number (required)
 * lowStockThreshold: number (required)
 * isActive: boolean (required)
 * createdAt: Timestamp
 * updatedAt: Timestamp
 */

// ============================================================================
// VALIDATION FUNCTIONS (BUSINESS RULES ENFORCEMENT)
// ============================================================================

/**
 * Validate product data against schema and business rules
 * @param {Object} productData - Product data to validate
 * @param {boolean} isUpdate - Whether this is an update operation
 * @throws {Error} If validation fails
 */
const validateProductData = (productData, isUpdate = false) => {
  const errors = [];

  // Required fields (for create)
  if (!isUpdate) {
    if (!productData.name || typeof productData.name !== 'string' || productData.name.trim() === '') {
      errors.push('Product name is required');
    }
    
    if (!productData.sku || typeof productData.sku !== 'string' || productData.sku.trim() === '') {
      errors.push('SKU is required');
    }
    
    if (!productData.category || !['men', 'women', 'kids'].includes(productData.category)) {
      errors.push('Category must be one of: men, women, kids');
    }
    
    if (!productData.subcategory || typeof productData.subcategory !== 'string' || productData.subcategory.trim() === '') {
      errors.push('Subcategory is required');
    }
    
    if (typeof productData.basePrice !== 'number' || productData.basePrice <= 0) {
      errors.push('Base price must be a positive number');
    }
    
    if (![5, 12, 18].includes(productData.gstRate)) {
      errors.push('GST rate must be 5, 12, or 18');
    }
    
    if (typeof productData.isTaxInclusive !== 'boolean') {
      errors.push('isTaxInclusive must be a boolean');
    }
    
    if (typeof productData.isOnSale !== 'boolean') {
      errors.push('isOnSale must be a boolean');
    }
    
    if (typeof productData.stockQty !== 'number' || productData.stockQty < 0) {
      errors.push('Stock quantity must be a non-negative number');
    }
    
    if (typeof productData.lowStockThreshold !== 'number' || productData.lowStockThreshold < 0) {
      errors.push('Low stock threshold must be a non-negative number');
    }
  }

  // Validate fields if present (for both create and update)
  if (productData.category && !['men', 'women', 'kids'].includes(productData.category)) {
    errors.push('Category must be one of: men, women, kids');
  }

  if (productData.gstRate !== undefined && ![5, 12, 18].includes(productData.gstRate)) {
    errors.push('GST rate must be 5, 12, or 18');
  }

  if (productData.basePrice !== undefined && (typeof productData.basePrice !== 'number' || productData.basePrice <= 0)) {
    errors.push('Base price must be a positive number');
  }

  if (productData.stockQty !== undefined && (typeof productData.stockQty !== 'number' || productData.stockQty < 0)) {
    errors.push('Stock quantity must be a non-negative number');
  }

  if (productData.lowStockThreshold !== undefined && (typeof productData.lowStockThreshold !== 'number' || productData.lowStockThreshold < 0)) {
    errors.push('Low stock threshold must be a non-negative number');
  }

  // CRITICAL BUSINESS RULE: Sale price must be lower than base price
  if (productData.salePrice !== null && productData.salePrice !== undefined) {
    if (typeof productData.salePrice !== 'number' || productData.salePrice <= 0) {
      errors.push('Sale price must be a positive number');
    }
    
    const basePrice = productData.basePrice;
    if (basePrice && productData.salePrice >= basePrice) {
      errors.push('Sale price must be lower than base price');
    }
  }

  // If on sale, sale price must be set
  if (productData.isOnSale && (productData.salePrice === null || productData.salePrice === undefined)) {
    errors.push('Sale price is required when product is on sale');
  }

  if (errors.length > 0) {
    throw new Error('Product validation failed: ' + errors.join(', '));
  }
};

/**
 * Check if SKU already exists
 * @param {string} sku - SKU to check
 * @param {string} excludeProductId - Product ID to exclude from check (for updates)
 * @returns {Promise<boolean>} True if SKU exists
 */
const skuExists = async (sku, excludeProductId = null) => {
  try {
    const q = query(collection(db, 'products'), where('sku', '==', sku));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return false;
    }
    
    // If updating, check if the SKU belongs to a different product
    if (excludeProductId) {
      return querySnapshot.docs.some(doc => doc.id !== excludeProductId);
    }
    
    return true;
  } catch (error) {
    console.error('Error checking SKU:', error);
    throw error;
  }
};

// ============================================================================
// EMPLOYEE-SAFE PRODUCT QUERIES (READ-ONLY, ACTIVE PRODUCTS ONLY)
// ============================================================================

/**
 * Get all active products (Employee-safe)
 * Returns only active products with approved fields
 * @returns {Promise<Array>} List of active products
 */
export const getActiveProducts = async () => {
  try {
    const q = query(collection(db, 'products'), where('isActive', '==', true));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name,
      sku: doc.data().sku,
      category: doc.data().category,
      subcategory: doc.data().subcategory,
      basePrice: doc.data().basePrice,
      gstRate: doc.data().gstRate,
      isTaxInclusive: doc.data().isTaxInclusive,
      isOnSale: doc.data().isOnSale,
      salePrice: doc.data().salePrice,
      stockQty: doc.data().stockQty,
      lowStockThreshold: doc.data().lowStockThreshold
    }));
  } catch (error) {
    console.error('Error fetching active products:', error);
    throw error;
  }
};

/**
 * Get products by category (Employee-safe)
 * @param {string} category - Product category ('men' | 'women' | 'kids')
 * @returns {Promise<Array>} List of active products in category
 */
export const getProductsByCategory = async (category) => {
  try {
    if (!['men', 'women', 'kids'].includes(category)) {
      throw new Error('Invalid category');
    }
    
    const q = query(
      collection(db, 'products'), 
      where('category', '==', category),
      where('isActive', '==', true)
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name,
      sku: doc.data().sku,
      category: doc.data().category,
      subcategory: doc.data().subcategory,
      basePrice: doc.data().basePrice,
      gstRate: doc.data().gstRate,
      isTaxInclusive: doc.data().isTaxInclusive,
      isOnSale: doc.data().isOnSale,
      salePrice: doc.data().salePrice,
      stockQty: doc.data().stockQty,
      lowStockThreshold: doc.data().lowStockThreshold
    }));
  } catch (error) {
    console.error('Error fetching products by category:', error);
    throw error;
  }
};

/**
 * Get product by ID (Employee-safe)
 * @param {string} productId - Product document ID
 * @returns {Promise<Object|null>} Product data or null
 */
export const getProductById = async (productId) => {
  try {
    const productDoc = await getDoc(doc(db, 'products', productId));
    
    if (!productDoc.exists() || !productDoc.data().isActive) {
      return null;
    }
    
    return {
      id: productDoc.id,
      name: productDoc.data().name,
      sku: productDoc.data().sku,
      category: productDoc.data().category,
      subcategory: productDoc.data().subcategory,
      basePrice: productDoc.data().basePrice,
      gstRate: productDoc.data().gstRate,
      isTaxInclusive: productDoc.data().isTaxInclusive,
      isOnSale: productDoc.data().isOnSale,
      salePrice: productDoc.data().salePrice,
      stockQty: productDoc.data().stockQty,
      lowStockThreshold: productDoc.data().lowStockThreshold
    };
  } catch (error) {
    console.error('Error fetching product:', error);
    throw error;
  }
};

// ============================================================================
// OWNER-ONLY PRODUCT MANAGEMENT (FULL CRUD ACCESS)
// ============================================================================

/**
 * Get all products including inactive (Owner only)
 * @returns {Promise<Array>} List of all products
 */
export const getAllProducts = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'products'));
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching all products:', error);
    throw error;
  }
};

/**
 * Get product by ID with full data (Owner only)
 * @param {string} productId - Product document ID
 * @returns {Promise<Object|null>} Full product data or null
 */
export const getProductByIdOwner = async (productId) => {
  try {
    const productDoc = await getDoc(doc(db, 'products', productId));
    
    if (!productDoc.exists()) {
      return null;
    }
    
    return {
      id: productDoc.id,
      ...productDoc.data()
    };
  } catch (error) {
    console.error('Error fetching product:', error);
    throw error;
  }
};

/**
 * Create product (Owner only)
 * Validates all fields and enforces business rules
 * @param {Object} productData - Product information
 * @returns {Promise<string>} Product document ID
 */
export const createProduct = async (productData) => {
  try {
    // Validate product data
    validateProductData(productData, false);
    
    // Check SKU uniqueness
    const skuAlreadyExists = await skuExists(productData.sku);
    if (skuAlreadyExists) {
      throw new Error('SKU already exists');
    }
    
    // Prepare product document
    const productRef = doc(collection(db, 'products'));
    const productDoc = {
      name: productData.name.trim(),
      sku: productData.sku.trim().toUpperCase(),
      category: productData.category,
      subcategory: productData.subcategory.trim(),
      basePrice: productData.basePrice,
      gstRate: productData.gstRate,
      isTaxInclusive: productData.isTaxInclusive,
      isOnSale: productData.isOnSale,
      salePrice: productData.isOnSale ? productData.salePrice : null,
      stockQty: productData.stockQty,
      lowStockThreshold: productData.lowStockThreshold,
      isActive: productData.isActive !== undefined ? productData.isActive : true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    await setDoc(productRef, productDoc);
    
    return productRef.id;
  } catch (error) {
    console.error('Error creating product:', error);
    throw error;
  }
};

/**
 * Update product (Owner only)
 * Validates updates and enforces business rules
 * @param {string} productId - Product document ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<void>}
 */
export const updateProduct = async (productId, updates) => {
  try {
    // Validate updates
    validateProductData(updates, true);
    
    // Check SKU uniqueness if SKU is being updated
    if (updates.sku) {
      const skuAlreadyExists = await skuExists(updates.sku, productId);
      if (skuAlreadyExists) {
        throw new Error('SKU already exists');
      }
      updates.sku = updates.sku.trim().toUpperCase();
    }
    
    // Trim string fields
    if (updates.name) updates.name = updates.name.trim();
    if (updates.subcategory) updates.subcategory = updates.subcategory.trim();
    
    // If turning off sale, clear sale price
    if (updates.isOnSale === false) {
      updates.salePrice = null;
    }
    
    // Add updated timestamp
    updates.updatedAt = serverTimestamp();
    
    const productRef = doc(db, 'products', productId);
    await setDoc(productRef, updates, { merge: true });
  } catch (error) {
    console.error('Error updating product:', error);
    throw error;
  }
};

/**
 * Toggle product active status (Owner only)
 * @param {string} productId - Product document ID
 * @param {boolean} isActive - New active status
 * @returns {Promise<void>}
 */
export const toggleProductActive = async (productId, isActive) => {
  try {
    const productRef = doc(db, 'products', productId);
    await setDoc(productRef, {
      isActive,
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (error) {
    console.error('Error toggling product status:', error);
    throw error;
  }
};

/**
 * Update product stock (Owner only)
 * @param {string} productId - Product document ID
 * @param {number} newStockQty - New stock quantity
 * @returns {Promise<void>}
 */
export const updateProductStock = async (productId, newStockQty) => {
  try {
    if (typeof newStockQty !== 'number' || newStockQty < 0) {
      throw new Error('Stock quantity must be a non-negative number');
    }
    
    const productRef = doc(db, 'products', productId);
    await setDoc(productRef, {
      stockQty: newStockQty,
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (error) {
    console.error('Error updating product stock:', error);
    throw error;
  }
};
