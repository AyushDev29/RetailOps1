import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

/**
 * Fix owner user to have isActive: true
 * Run this once if your owner account was created before isActive field was added
 */
export const fixOwnerActive = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      throw new Error('User not found');
    }
    
    const userData = userDoc.data();
    
    // Check if isActive field exists
    if (userData.isActive === undefined) {
      console.log('Adding isActive field to user...');
      await setDoc(userRef, {
        isActive: true,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      console.log('✅ User updated with isActive: true');
      return true;
    } else {
      console.log('User already has isActive field:', userData.isActive);
      return false;
    }
  } catch (error) {
    console.error('Error fixing owner active status:', error);
    throw error;
  }
};
