/**
 * UTILITY: Merge Divided Orders
 * ==============================
 * This script merges old orders that were split (one order per product)
 * into new orders with multiple items.
 * 
 * HOW TO USE:
 * 1. Open browser console on Owner Dashboard
 * 2. Copy and paste this entire script
 * 3. Run: await mergeOldOrders()
 * 4. Check console for results
 */

import { collection, getDocs, doc, setDoc, deleteDoc, query, where, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';

/**
 * Merge old divided orders into new multi-item orders
 */
export const mergeOldOrders = async () => {
  try {
    console.log('🔄 Starting order migration...');
    
    // Get all orders
    const ordersSnapshot = await getDocs(collection(db, 'orders'));
    const allOrders = ordersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`📦 Found ${allOrders.length} total orders`);
    
    // Filter old schema orders (have productId field)
    const oldOrders = allOrders.filter(order => order.productId && !order.items);
    console.log(`🔍 Found ${oldOrders.length} old schema orders to migrate`);
    
    if (oldOrders.length === 0) {
      console.log('✅ No old orders to migrate!');
      return { success: true, migrated: 0, deleted: 0 };
    }
    
    // Group orders by customer phone and timestamp (within 1 minute = same sale)
    const orderGroups = {};
    
    oldOrders.forEach(order => {
      const timestamp = order.createdAt?.toMillis() || 0;
      const roundedTime = Math.floor(timestamp / 60000) * 60000; // Round to minute
      const key = `${order.customerPhone}_${order.createdBy}_${roundedTime}_${order.type}`;
      
      if (!orderGroups[key]) {
        orderGroups[key] = [];
      }
      orderGroups[key].push(order);
    });
    
    console.log(`📊 Grouped into ${Object.keys(orderGroups).length} potential sales`);
    
    let migratedCount = 0;
    let deletedCount = 0;
    
    // Process each group
    for (const [key, orders] of Object.entries(orderGroups)) {
      if (orders.length === 1) {
        // Single item order - convert to new schema
        const order = orders[0];
        
        const newOrderRef = doc(collection(db, 'orders'));
        await setDoc(newOrderRef, {
          type: order.type,
          customerPhone: order.customerPhone,
          items: [{
            productId: order.productId,
            productName: order.productId, // We don't have name in old schema
            sku: order.productId,
            quantity: order.quantity,
            unitPrice: order.price,
            lineTotal: order.price * order.quantity
          }],
          totals: {
            subtotal: order.price * order.quantity,
            totalCGST: 0,
            totalSGST: 0,
            totalTax: 0,
            grandTotal: order.price * order.quantity,
            payableAmount: Math.round(order.price * order.quantity)
          },
          status: order.status,
          exhibitionId: order.exhibitionId || null,
          createdBy: order.createdBy,
          deliveryDate: order.deliveryDate || null,
          billId: null,
          createdAt: order.createdAt || serverTimestamp()
        });
        
        // Delete old order
        await deleteDoc(doc(db, 'orders', order.id));
        
        migratedCount++;
        deletedCount++;
        
        console.log(`✅ Migrated single-item order: ${order.id}`);
      } else {
        // Multiple items - merge into one order
        const firstOrder = orders[0];
        
        const items = orders.map(order => ({
          productId: order.productId,
          productName: order.productId,
          sku: order.productId,
          quantity: order.quantity,
          unitPrice: order.price,
          lineTotal: order.price * order.quantity
        }));
        
        const totalAmount = orders.reduce((sum, order) => sum + (order.price * order.quantity), 0);
        
        const newOrderRef = doc(collection(db, 'orders'));
        await setDoc(newOrderRef, {
          type: firstOrder.type,
          customerPhone: firstOrder.customerPhone,
          items,
          totals: {
            subtotal: totalAmount,
            totalCGST: 0,
            totalSGST: 0,
            totalTax: 0,
            grandTotal: totalAmount,
            payableAmount: Math.round(totalAmount)
          },
          status: firstOrder.status,
          exhibitionId: firstOrder.exhibitionId || null,
          createdBy: firstOrder.createdBy,
          deliveryDate: firstOrder.deliveryDate || null,
          billId: null,
          createdAt: firstOrder.createdAt || serverTimestamp()
        });
        
        // Delete all old orders
        for (const order of orders) {
          await deleteDoc(doc(db, 'orders', order.id));
          deletedCount++;
        }
        
        migratedCount++;
        
        console.log(`✅ Merged ${orders.length} orders into one: ${newOrderRef.id}`);
      }
    }
    
    console.log('🎉 Migration complete!');
    console.log(`📈 Created ${migratedCount} new orders`);
    console.log(`🗑️  Deleted ${deletedCount} old orders`);
    
    return {
      success: true,
      migrated: migratedCount,
      deleted: deletedCount
    };
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
};

/**
 * Delete ALL orders (use with caution!)
 */
export const deleteAllOrders = async () => {
  const confirmed = window.confirm('⚠️ This will DELETE ALL ORDERS. Are you sure?');
  if (!confirmed) {
    console.log('❌ Cancelled');
    return;
  }
  
  try {
    console.log('🗑️  Deleting all orders...');
    
    const ordersSnapshot = await getDocs(collection(db, 'orders'));
    let count = 0;
    
    for (const orderDoc of ordersSnapshot.docs) {
      await deleteDoc(doc(db, 'orders', orderDoc.id));
      count++;
    }
    
    console.log(`✅ Deleted ${count} orders`);
    return { success: true, deleted: count };
    
  } catch (error) {
    console.error('❌ Delete failed:', error);
    throw error;
  }
};
