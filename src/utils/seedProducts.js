import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';

/**
 * Seed sample products into Firestore
 * Run this once to populate products
 */
export const seedProducts = async () => {
  const products = [
    { name: 'Cotton Saree', category: 'Saree' },
    { name: 'Silk Saree', category: 'Saree' },
    { name: 'Designer Saree', category: 'Saree' },
    { name: 'Casual Kurti', category: 'Kurti' },
    { name: 'Party Wear Kurti', category: 'Kurti' },
    { name: 'Anarkali Kurti', category: 'Kurti' },
    { name: 'Summer Dress', category: 'Dress' },
    { name: 'Evening Gown', category: 'Dress' },
    { name: 'Casual Dress', category: 'Dress' },
    { name: 'Lehenga Choli', category: 'Lehenga' },
    { name: 'Salwar Suit', category: 'Salwar' },
    { name: 'Palazzo Set', category: 'Palazzo' }
  ];

  try {
    console.log('Starting to seed products...');
    
    for (const product of products) {
      const productRef = doc(collection(db, 'products'));
      await setDoc(productRef, {
        name: product.name,
        category: product.category,
        active: true,
        createdAt: serverTimestamp()
      });
      console.log(`✓ Created: ${product.name}`);
    }
    
    console.log('✅ All products seeded successfully!');
    return { success: true, count: products.length };
  } catch (error) {
    console.error('❌ Error seeding products:', error);
    throw error;
  }
};
