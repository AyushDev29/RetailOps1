import { 
  collection, 
  doc, 
  getDoc,
  getDocs, 
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from './firebase';

/**
 * Check if employee has an active exhibition
 * @param {string} employeeId - Employee UID
 * @returns {Object|null} Active exhibition or null
 */
export const getActiveExhibition = async (employeeId) => {
  try {
    const q = query(
      collection(db, 'exhibitions'),
      where('createdBy', '==', employeeId),
      where('active', '==', true),
      limit(1)
    );
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
    console.error('Error fetching active exhibition:', error);
    throw error;
  }
};

/**
 * Start a new exhibition
 * @param {Object} exhibitionData - Exhibition information
 * @returns {string} Exhibition document ID
 */
export const startExhibition = async (exhibitionData) => {
  try {
    const { location, startTime, createdBy } = exhibitionData;
    
    // Check if employee already has an active exhibition
    const activeExhibition = await getActiveExhibition(createdBy);
    
    if (activeExhibition) {
      throw new Error('You already have an active exhibition. Please end it before starting a new one.');
    }
    
    const exhibitionRef = doc(collection(db, 'exhibitions'));
    await setDoc(exhibitionRef, {
      location,
      startTime,
      endTime: null,
      createdBy,
      active: true,
      createdAt: serverTimestamp()
    });
    
    return exhibitionRef.id;
  } catch (error) {
    console.error('Error starting exhibition:', error);
    throw error;
  }
};

/**
 * End an exhibition
 * @param {string} exhibitionId - Exhibition document ID
 */
export const endExhibition = async (exhibitionId) => {
  try {
    const exhibitionRef = doc(db, 'exhibitions', exhibitionId);
    const exhibitionDoc = await getDoc(exhibitionRef);
    
    if (!exhibitionDoc.exists()) {
      throw new Error('Exhibition not found');
    }
    
    const exhibitionData = exhibitionDoc.data();
    
    if (!exhibitionData.active) {
      throw new Error('Exhibition is already ended');
    }
    
    await updateDoc(exhibitionRef, {
      endTime: serverTimestamp(),
      active: false,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error ending exhibition:', error);
    throw error;
  }
};

/**
 * Update exhibition metadata (location, startTime only)
 * @param {string} exhibitionId - Exhibition document ID
 * @param {Object} updates - Fields to update (location, startTime)
 */
export const updateExhibitionMetadata = async (exhibitionId, updates) => {
  try {
    const exhibitionRef = doc(db, 'exhibitions', exhibitionId);
    const exhibitionDoc = await getDoc(exhibitionRef);
    
    if (!exhibitionDoc.exists()) {
      throw new Error('Exhibition not found');
    }
    
    // Only allow updating location and startTime
    const allowedUpdates = {};
    if (updates.location) allowedUpdates.location = updates.location;
    if (updates.startTime) allowedUpdates.startTime = updates.startTime;
    
    if (Object.keys(allowedUpdates).length === 0) {
      throw new Error('No valid fields to update');
    }
    
    allowedUpdates.updatedAt = serverTimestamp();
    
    await updateDoc(exhibitionRef, allowedUpdates);
  } catch (error) {
    console.error('Error updating exhibition metadata:', error);
    throw error;
  }
};

/**
 * Get exhibition by ID
 * @param {string} exhibitionId - Exhibition document ID
 * @returns {Object|null} Exhibition data or null
 */
export const getExhibitionById = async (exhibitionId) => {
  try {
    const exhibitionDoc = await getDoc(doc(db, 'exhibitions', exhibitionId));
    
    if (!exhibitionDoc.exists()) {
      return null;
    }
    
    return {
      id: exhibitionDoc.id,
      ...exhibitionDoc.data()
    };
  } catch (error) {
    console.error('Error fetching exhibition:', error);
    throw error;
  }
};

/**
 * Get all exhibitions by employee
 * @param {string} employeeId - Employee UID
 * @returns {Array} List of exhibitions
 */
export const getExhibitionsByEmployee = async (employeeId) => {
  try {
    const q = query(
      collection(db, 'exhibitions'),
      where('createdBy', '==', employeeId)
    );
    const querySnapshot = await getDocs(q);
    
    // Sort in memory
    const exhibitions = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return exhibitions.sort((a, b) => {
      if (!a.createdAt || !b.createdAt) return 0;
      return b.createdAt.toMillis() - a.createdAt.toMillis();
    });
  } catch (error) {
    console.error('Error fetching exhibitions by employee:', error);
    throw error;
  }
};

/**
 * Get all exhibitions (for owner/analytics)
 * @returns {Array} List of all exhibitions
 */
export const getAllExhibitions = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'exhibitions'));
    
    // Sort in memory
    const exhibitions = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return exhibitions.sort((a, b) => {
      if (!a.createdAt || !b.createdAt) return 0;
      return b.createdAt.toMillis() - a.createdAt.toMillis();
    });
  } catch (error) {
    console.error('Error fetching all exhibitions:', error);
    throw error;
  }
};
