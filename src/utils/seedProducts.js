import { createProduct } from '../services/productService';

/**
 * Seed sample products with PRD-compliant schema
 * Owner-only operation
 */
export const seedProducts = async () => {
  const sampleProducts = [
    {
      name: 'Classic Cotton T-Shirt',
      sku: 'MEN-TSH-001',
      category: 'men',
      subcategory: 'Tshirt',
      basePrice: 999,
      gstRate: 12,
      isTaxInclusive: false,
      isOnSale: false,
      salePrice: null,
      stockQty: 150,
      lowStockThreshold: 20,
      isActive: true
    },
    {
      name: 'Slim Fit Jeans',
      sku: 'MEN-JNS-001',
      category: 'men',
      subcategory: 'Jeans',
      basePrice: 2499,
      gstRate: 12,
      isTaxInclusive: false,
      isOnSale: true,
      salePrice: 1999,
      stockQty: 80,
      lowStockThreshold: 15,
      isActive: true
    },
    {
      name: 'Formal Shirt',
      sku: 'MEN-SHT-001',
      category: 'men',
      subcategory: 'Shirt',
      basePrice: 1799,
      gstRate: 12,
      isTaxInclusive: false,
      isOnSale: false,
      salePrice: null,
      stockQty: 100,
      lowStockThreshold: 20,
      isActive: true
    },
    {
      name: 'Casual Kurti',
      sku: 'WMN-KRT-001',
      category: 'women',
      subcategory: 'Kurti',
      basePrice: 1499,
      gstRate: 12,
      isTaxInclusive: false,
      isOnSale: true,
      salePrice: 1199,
      stockQty: 120,
      lowStockThreshold: 25,
      isActive: true
    },
    {
      name: 'Designer Saree',
      sku: 'WMN-SAR-001',
      category: 'women',
      subcategory: 'Saree',
      basePrice: 4999,
      gstRate: 5,
      isTaxInclusive: false,
      isOnSale: false,
      salePrice: null,
      stockQty: 50,
      lowStockThreshold: 10,
      isActive: true
    },
    {
      name: 'Palazzo Pants',
      sku: 'WMN-PLZ-001',
      category: 'women',
      subcategory: 'Pants',
      basePrice: 1299,
      gstRate: 12,
      isTaxInclusive: false,
      isOnSale: false,
      salePrice: null,
      stockQty: 90,
      lowStockThreshold: 20,
      isActive: true
    },
    {
      name: 'Kids Cotton T-Shirt',
      sku: 'KID-TSH-001',
      category: 'kids',
      subcategory: 'Tshirt',
      basePrice: 599,
      gstRate: 5,
      isTaxInclusive: false,
      isOnSale: true,
      salePrice: 449,
      stockQty: 200,
      lowStockThreshold: 30,
      isActive: true
    },
    {
      name: 'Kids Denim Shorts',
      sku: 'KID-SHT-001',
      category: 'kids',
      subcategory: 'Shorts',
      basePrice: 899,
      gstRate: 12,
      isTaxInclusive: false,
      isOnSale: false,
      salePrice: null,
      stockQty: 150,
      lowStockThreshold: 25,
      isActive: true
    },
    {
      name: 'Kids Party Dress',
      sku: 'KID-DRS-001',
      category: 'kids',
      subcategory: 'Dress',
      basePrice: 1999,
      gstRate: 12,
      isTaxInclusive: false,
      isOnSale: true,
      salePrice: 1599,
      stockQty: 60,
      lowStockThreshold: 15,
      isActive: true
    },
    {
      name: 'Anarkali Kurti',
      sku: 'WMN-ANK-001',
      category: 'women',
      subcategory: 'Kurti',
      basePrice: 2299,
      gstRate: 12,
      isTaxInclusive: false,
      isOnSale: false,
      salePrice: null,
      stockQty: 75,
      lowStockThreshold: 15,
      isActive: true
    },
    {
      name: 'Casual Kurti',
      sku: 'WMN-KRT-002',
      category: 'women',
      subcategory: 'Kurti',
      basePrice: 1299,
      gstRate: 12,
      isTaxInclusive: false,
      isOnSale: false,
      salePrice: null,
      stockQty: 110,
      lowStockThreshold: 20,
      isActive: true
    },
    {
      name: 'Tshirt merchandies (MI)',
      sku: 'MEN-TSH-002',
      category: 'men',
      subcategory: 'Tshirt',
      basePrice: 799,
      gstRate: 12,
      isTaxInclusive: false,
      isOnSale: true,
      salePrice: 599,
      stockQty: 180,
      lowStockThreshold: 30,
      isActive: true
    }
  ];

  try {
    console.log('Starting to seed products with new schema...');
    
    for (const product of sampleProducts) {
      try {
        await createProduct(product);
        console.log(`✓ Created: ${product.name} (${product.sku})`);
      } catch (error) {
        console.error(`✗ Failed to create ${product.name}:`, error.message);
      }
    }
    
    console.log('✅ Product seeding completed!');
    return { success: true, count: sampleProducts.length };
  } catch (error) {
    console.error('❌ Error seeding products:', error);
    throw error;
  }
};
