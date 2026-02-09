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
 * Get all active products
 * @returns {Array} List of active products
 */
export const getActiveProducts = async () => {
  try {
    const q = query(collection(db, 'products'), where('active', '==', true));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching active products:', error);
    throw error;
  }
};

/**
 * Get all products (including inactive) - Owner only
 * @returns {Array} List of all products
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
 * Get product by ID
 * @param {string} productId - Product document ID
 * @returns {Object|null} Product data or null
 */
export const getProductById = async (productId) => {
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
 * Get products by category
 * @param {string} category - Product category
 * @returns {Array} List of products in category
 */
export const getProductsByCategory = async (category) => {
  try {
    const q = query(
      collection(db, 'products'), 
      where('category', '==', category),
      where('active', '==', true)
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching products by category:', error);
    throw error;
  }
};

/**
 * Create product - Owner only
 * @param {Object} productData - Product information
 * @returns {string} Product document ID
 */
export const createProduct = async (productData) => {
  try {
    const { name, category } = productData;
    
    const productRef = doc(collection(db, 'products'));
    await setDoc(productRef, {
      name,
      category,
      active: true,
      createdAt: serverTimestamp()
    });
    
    return productRef.id;
  } catch (error) {
    console.error('Error creating product:', error);
    throw error;
  }
};

/**
 * Update product - Owner only
 * @param {string} productId - Product document ID
 * @param {Object} updates - Fields to update
 */
export const updateProduct = async (productId, updates) => {
  try {
    const productRef = doc(db, 'products', productId);
    await setDoc(productRef, {
      ...updates,
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (error) {
    console.error('Error updating product:', error);
    throw error;
  }
};
