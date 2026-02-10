import * as XLSX from 'xlsx';

/**
 * Export data to Excel file
 */
export const exportToExcel = (data, filename) => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
  
  // Auto-size columns
  const maxWidth = data.reduce((w, r) => Math.max(w, ...Object.keys(r).map(k => k.length)), 10);
  worksheet['!cols'] = Object.keys(data[0] || {}).map(() => ({ wch: maxWidth }));
  
  XLSX.writeFile(workbook, `${filename}.xlsx`);
};

/**
 * Import products from Excel file
 */
export const importProductsFromExcel = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);
        
        // Validate and transform data
        const products = jsonData.map((row, index) => {
          // Required fields validation
          if (!row.name || !row.sku || !row.category) {
            throw new Error(`Row ${index + 2}: Missing required fields (name, sku, category)`);
          }
          
          return {
            name: String(row.name).trim(),
            sku: String(row.sku).trim().toUpperCase(),
            category: String(row.category).trim().toLowerCase(),
            price: parseFloat(row.price) || 0,
            gstRate: parseFloat(row.gstRate) || 18,
            stockQty: parseInt(row.stockQty) || 0,
            lowStockThreshold: parseInt(row.lowStockThreshold) || 10,
            description: row.description ? String(row.description).trim() : ''
          };
        });
        
        resolve(products);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Download Excel template for product import
 */
export const downloadProductTemplate = () => {
  const template = [
    {
      name: 'Classic Cotton T-Shirt',
      sku: 'MEN-TSH-001',
      category: 'men',
      price: 999,
      gstRate: 18,
      stockQty: 50,
      lowStockThreshold: 10,
      description: 'Comfortable cotton t-shirt'
    },
    {
      name: 'Denim Jeans',
      sku: 'WOM-JNS-001',
      category: 'women',
      price: 1999,
      gstRate: 18,
      stockQty: 30,
      lowStockThreshold: 5,
      description: 'Stylish denim jeans'
    }
  ];
  
  exportToExcel(template, 'product_import_template');
};

/**
 * Export products to Excel
 */
export const exportProducts = (products) => {
  const exportData = products.map(p => ({
    Name: p.name,
    SKU: p.sku,
    Category: p.category,
    Price: p.price,
    'GST Rate': p.gstRate,
    'Stock Quantity': p.stockQty,
    'Low Stock Threshold': p.lowStockThreshold,
    Description: p.description || '',
    'Created At': p.createdAt?.toDate ? p.createdAt.toDate().toLocaleDateString() : 'N/A'
  }));
  
  exportToExcel(exportData, `products_export_${new Date().toISOString().split('T')[0]}`);
};

/**
 * Export analytics data to Excel
 */
export const exportAnalyticsData = (analytics, filters) => {
  const workbook = XLSX.utils.book_new();
  
  // Summary Sheet
  const summary = [
    { Metric: 'Total Revenue', Value: `₹${analytics.totalRevenue.toFixed(2)}`, Growth: `${analytics.revenueGrowth.toFixed(1)}%` },
    { Metric: 'Total Orders', Value: analytics.totalOrders, Growth: `${analytics.ordersGrowth.toFixed(1)}%` },
    { Metric: 'Items Sold', Value: analytics.totalItemsSold, Growth: `${analytics.itemsGrowth.toFixed(1)}%` },
    { Metric: 'Avg Order Value', Value: `₹${analytics.avgOrderValue.toFixed(2)}`, Growth: `${analytics.aovGrowth.toFixed(1)}%` }
  ];
  const summarySheet = XLSX.utils.json_to_sheet(summary);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
  
  // Top Products Sheet
  if (analytics.topProducts && analytics.topProducts.length > 0) {
    const topProducts = analytics.topProducts.map((p, i) => ({
      Rank: i + 1,
      Product: p.name,
      Revenue: `₹${p.revenue.toFixed(2)}`
    }));
    const productsSheet = XLSX.utils.json_to_sheet(topProducts);
    XLSX.utils.book_append_sheet(workbook, productsSheet, 'Top Products');
  }
  
  // Category Performance Sheet
  if (analytics.categoryPerformance && analytics.categoryPerformance.length > 0) {
    const categories = analytics.categoryPerformance.map(c => ({
      Category: c.category.charAt(0).toUpperCase() + c.category.slice(1),
      Revenue: `₹${c.revenue.toFixed(2)}`,
      Orders: c.orders,
      'Avg Value': `₹${c.avgValue.toFixed(2)}`,
      'Growth %': c.growth.toFixed(1)
    }));
    const categorySheet = XLSX.utils.json_to_sheet(categories);
    XLSX.utils.book_append_sheet(workbook, categorySheet, 'Categories');
  }
  
  // Employee Performance Sheet
  if (analytics.employeePerformance && analytics.employeePerformance.length > 0) {
    const employees = analytics.employeePerformance.map(e => ({
      Employee: e.name,
      Revenue: `₹${e.revenue.toFixed(2)}`,
      Orders: e.orders,
      'Avg Order': `₹${e.avgOrder.toFixed(2)}`
    }));
    const employeeSheet = XLSX.utils.json_to_sheet(employees);
    XLSX.utils.book_append_sheet(workbook, employeeSheet, 'Employees');
  }
  
  // Revenue Trend Sheet
  if (analytics.revenueTrend && analytics.revenueTrend.length > 0) {
    const trend = analytics.revenueTrend.map(t => ({
      Date: t.date,
      Revenue: `₹${t.revenue.toFixed(2)}`,
      Orders: t.orders || 0
    }));
    const trendSheet = XLSX.utils.json_to_sheet(trend);
    XLSX.utils.book_append_sheet(workbook, trendSheet, 'Revenue Trend');
  }
  
  const dateRange = filters.dateRange || 'all';
  XLSX.writeFile(workbook, `analytics_${dateRange}_${new Date().toISOString().split('T')[0]}.xlsx`);
};
