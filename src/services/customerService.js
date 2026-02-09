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
 * Get customer by phone number (unique identifier)
 * @param {string} phone - Customer phone number
 * @returns {Object|null} Customer data or null if not found
 */
export const getCustomerByPhone = async (phone) => {
  try {
    const q = query(collection(db, 'customers'), where('phone', '==', phone));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    const doc = querySnapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data()
    };
  } catch (error) {
    console.error('Error fetching customer by phone:', error);
    throw error;
  }
};

/**
 * Create or update customer
 * @param {Object} customerData - Customer information
 * @returns {string} Customer document ID
 */
export const createOrUpdateCustomer = async (customerData) => {
  try {
    const { phone, name, address, gender, ageGroup } = customerData;
    
    // Check if customer exists
    const existingCustomer = await getCustomerByPhone(phone);
    
    if (existingCustomer) {
      // Update existing customer
      const customerRef = doc(db, 'customers', existingCustomer.id);
      await setDoc(customerRef, {
        name,
        phone,
        address,
        gender,
        ageGroup,
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      return existingCustomer.id;
    } else {
      // Create new customer
      const customerRef = doc(collection(db, 'customers'));
      await setDoc(customerRef, {
        name,
        phone,
        address,
        gender,
        ageGroup,
        createdAt: serverTimestamp()
      });
      
      return customerRef.id;
    }
  } catch (error) {
    console.error('Error creating/updating customer:', error);
    throw error;
  }
};

/**
 * Get all customers
 * @returns {Array} List of customers
 */
export const getAllCustomers = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'customers'));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching customers:', error);
    throw error;
  }
};
