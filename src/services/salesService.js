import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebase';

export const addSale = async (saleData) => {
  return await addDoc(collection(db, 'sales'), saleData);
};

export const getSales = async (filters = {}) => {
  const q = query(collection(db, 'sales'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
