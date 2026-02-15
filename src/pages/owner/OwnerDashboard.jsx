import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getAllUsers, updateUser } from '../../services/authService';
import { getAllProducts, createProduct, updateProduct, toggleProductActive, deductStockBatch, deleteProduct } from '../../services/productService';
import { seedProducts } from '../../utils/seedProducts';
import { fixOwnerActive } from '../../utils/fixOwnerActive';
import { getAllExhibitions } from '../../services/exhibitionService';
import { getAllOrders } from '../../services/orderService';
import { getBillById } from '../../services/billStorageService';
import { generateBill } from '../../services/billingService';
import { calculateOrder } from '../../services/orderCalculationService';
import BillPreview from '../../components/billing/BillPreview';
import {
  exportProducts,
  importProductsFromExcel,
  downloadProductTemplate
} from '../../utils/excelUtils';
import '../../styles/OwnerDashboard.css';

const OwnerDashboard = () => {
  const { user, userProfile, logout } = useAuth();
  const navigate = useNavigate();

  // State management
  const [activeTab, setActiveTab] = useState(() => {
    // Restore active tab from localStorage or default to 'products'
    return localStorage.getItem('ownerActiveTab') || 'products';
  }); // 'products' | 'exhibitions' | 'orders'
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [exhibitions, setExhibitions] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Bill viewing state
  const [currentBill, setCurrentBill] = useState(null);
  const [showBill, setShowBill] = useState(false);

  // Product form state
  const [productForm, setProductForm] = useState({
    name: '',
    sku: '',
    category: 'men',
    subcategory: '',
    basePrice: '',
    gstRate: 12,
    isTaxInclusive: false,
    isOnSale: false,
    salePrice: '',
    stockQty: '',
    lowStockThreshold: 10,
    isActive: true
  });

  // Edit product state
  const [editingProduct, setEditingProduct] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // SKU Auto-generation state
  const [isSkuManuallyEdited, setIsSkuManuallyEdited] = useState(false);

  // Auto-generate SKU
  useEffect(() => {
    // Don't auto-generate if manually edited or if we are editing an existing product
    if (isSkuManuallyEdited || editingProduct) {
      return;
    }

    // Need at least some info to generate
    if (!productForm.category || !productForm.subcategory || !productForm.name) {
      return;
    }

    const cat = (productForm.category || '').substring(0, 3).toUpperCase();
    const sub = (productForm.subcategory || '').substring(0, 3).toUpperCase();
    const nameParts = (productForm.name || '').split(' ');
    // Use first 3 letters of first word, or if short, padding? Just first 3 chars of name is fine
    const name = (productForm.name || '').substring(0, 3).toUpperCase();

    // Generate a secure random 4-digit number
    // using a static seed based on contents to avoid jitter would be nice, but random is okay for now
    // To avoid jitter while typing, maybe only update if the base parts change? 
    // Actually, random is important for uniqueness. Let's stick to simple random for now.
    // To prevent it from changing on every keystroke of the SAME 3 letters, we can check if the prefix matches?
    // But simplest is just generate. The user will see it updating live.
    const rand = Math.floor(1000 + Math.random() * 9000);

    const autoSku = `${cat}-${sub}-${name}-${rand}`;

    setProductForm(prev => ({ ...prev, sku: autoSku }));
  }, [productForm.category, productForm.subcategory, productForm.name.substring(0, 3), isSkuManuallyEdited, editingProduct]);

  // Filters
  const [orderTypeFilter, setOrderTypeFilter] = useState('all');
  const [employeeFilter, setEmployeeFilter] = useState('all');

  // Lookup maps for resolving IDs to names
  const [userMap, setUserMap] = useState({});
  const [productMap, setProductMap] = useState({});

  // Load data based on active tab
  useEffect(() => {
    loadData();
    // Save active tab to localStorage
    localStorage.setItem('ownerActiveTab', activeTab);
  }, [activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      if (activeTab === 'products') {
        const productsData = await getAllProducts();
        setProducts(productsData);
        // Build product map for lookups
        const map = {};
        productsData.forEach(p => {
          map[p.id] = p.name;
        });
        setProductMap(map);
      } else if (activeTab === 'exhibitions') {
        const [exhibitionsData, usersData] = await Promise.all([
          getAllExhibitions(),
          getAllUsers()
        ]);
        setExhibitions(exhibitionsData);
        // Build user map for employee name resolution
        const map = {};
        usersData.forEach(u => {
          map[u.id] = u.name || u.email;
        });
        setUserMap(map);
      } else if (activeTab === 'orders') {
        const [ordersData, usersData, productsData] = await Promise.all([
          getAllOrders(),
          getAllUsers(),
          getAllProducts()
        ]);
        setOrders(ordersData);
        setUsers(usersData); // Set users array for handleViewBill
        setProducts(productsData); // Set products array for handleViewBill

        // Build lookup maps
        const uMap = {};
        usersData.forEach(u => {
          uMap[u.id] = u.name || u.email;
        });
        setUserMap(uMap);

        const pMap = {};
        productsData.forEach(p => {
          pMap[p.id] = p.name;
        });
        setProductMap(pMap);
      }
    } catch (err) {
      setError('Failed to load data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle user role change
  const handleRoleChange = async (userId, newRole) => {
    // Prevent owner from demoting themselves
    if (userId === user.uid && newRole === 'employee') {
      setError('You cannot demote yourself');
      return;
    }

    if (!window.confirm(`Are you sure you want to change this user's role to ${newRole}?`)) {
      return;
    }

    try {
      setError('');
      setSuccess('');

      await updateUser(userId, { role: newRole });
      setSuccess('User role updated successfully');
      await loadData();
    } catch (err) {
      setError('Failed to update role: ' + err.message);
    }
  };

  // Handle user active status toggle
  const handleToggleActive = async (userId, currentStatus) => {
    // Prevent owner from disabling themselves
    if (userId === user.uid && currentStatus === true) {
      setError('You cannot disable yourself');
      return;
    }

    if (!window.confirm(`Are you sure you want to ${currentStatus ? 'disable' : 'enable'} this user?`)) {
      return;
    }

    try {
      setError('');
      setSuccess('');

      await updateUser(userId, { isActive: !currentStatus });
      setSuccess(`User ${!currentStatus ? 'enabled' : 'disabled'} successfully`);
      await loadData();
    } catch (err) {
      setError('Failed to update user status: ' + err.message);
    }
  };

  // Handle create product
  const handleCreateProduct = async (e) => {
    e.preventDefault();

    try {
      setError('');
      setSuccess('');

      // Validate required fields
      if (!productForm.name || !productForm.sku || !productForm.category || !productForm.subcategory ||
        !productForm.basePrice || !productForm.stockQty) {
        setError('Please fill in all required fields');
        return;
      }

      // Validate sale price if on sale
      if (productForm.isOnSale && !productForm.salePrice) {
        setError('Sale price is required when product is on sale');
        return;
      }

      // Prepare product data
      const productData = {
        name: productForm.name,
        sku: productForm.sku,
        category: productForm.category,
        subcategory: productForm.subcategory,
        basePrice: parseFloat(productForm.basePrice),
        gstRate: parseInt(productForm.gstRate),
        isTaxInclusive: productForm.isTaxInclusive,
        isOnSale: productForm.isOnSale,
        salePrice: productForm.isOnSale ? parseFloat(productForm.salePrice) : null,
        stockQty: parseInt(productForm.stockQty),
        lowStockThreshold: parseInt(productForm.lowStockThreshold),
        isActive: productForm.isActive
      };

      await createProduct(productData);

      setSuccess('Product created successfully');
      setProductForm({
        name: '',
        sku: '',
        category: 'men',
        subcategory: '',
        basePrice: '',
        gstRate: 12,
        isTaxInclusive: false,
        isOnSale: false,
        salePrice: '',
        stockQty: '',
        lowStockThreshold: 10,
        isActive: true
      });
      setIsSkuManuallyEdited(false);
      await loadData();
    } catch (err) {
      setError('Failed to create product: ' + err.message);
    }
  };

  // Handle toggle product active status
  const handleToggleProductActive = async (productId, currentStatus) => {
    if (!window.confirm(`Are you sure you want to ${currentStatus ? 'deactivate' : 'activate'} this product?`)) {
      return;
    }

    try {
      setError('');
      setSuccess('');

      await toggleProductActive(productId, !currentStatus);
      setSuccess(`Product ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
      await loadData();
    } catch (err) {
      setError('Failed to update product: ' + err.message);
    }
  };

  // Handle edit product
  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      sku: product.sku,
      category: product.category,
      subcategory: product.subcategory,
      basePrice: product.basePrice.toString(),
      gstRate: product.gstRate,
      isTaxInclusive: product.isTaxInclusive,
      isOnSale: product.isOnSale,
      salePrice: product.salePrice ? product.salePrice.toString() : '',
      stockQty: product.stockQty.toString(),
      lowStockThreshold: product.lowStockThreshold,
      isActive: product.isActive
    });
    setIsSkuManuallyEdited(true); // Prevent auto-gen from overwriting existing SKU
    setShowEditModal(true);
  };

  // Handle update product
  const handleUpdateProduct = async (e) => {
    e.preventDefault();

    try {
      setError('');
      setSuccess('');
      setLoading(true);

      const updates = {
        name: productForm.name,
        category: productForm.category,
        subcategory: productForm.subcategory,
        basePrice: parseFloat(productForm.basePrice),
        gstRate: parseInt(productForm.gstRate),
        isTaxInclusive: productForm.isTaxInclusive,
        isOnSale: productForm.isOnSale,
        salePrice: productForm.isOnSale ? parseFloat(productForm.salePrice) : null,
        stockQty: parseInt(productForm.stockQty),
        lowStockThreshold: parseInt(productForm.lowStockThreshold),
        isActive: productForm.isActive
      };

      await updateProduct(editingProduct.id, updates);

      setSuccess('Product updated successfully!');
      setShowEditModal(false);
      setEditingProduct(null);
      setProductForm({
        name: '',
        sku: '',
        category: 'men',
        subcategory: '',
        basePrice: '',
        gstRate: 12,
        isTaxInclusive: false,
        isOnSale: false,
        salePrice: '',
        stockQty: '',
        lowStockThreshold: 10,
        isActive: true
      });
      await loadData();
    } catch (err) {
      setError('Failed to update product: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle delete product
  const handleDeleteProduct = async (productId, productName) => {
    if (!window.confirm(`Are you sure you want to DELETE "${productName}"? This action cannot be undone!`)) {
      return;
    }

    try {
      setError('');
      setSuccess('');

      await deleteProduct(productId);
      setSuccess(`Product "${productName}" deleted successfully`);
      await loadData();
    } catch (err) {
      setError('Failed to delete product: ' + err.message);
    }
  };

  // Handle seed products
  const handleSeedProducts = async () => {
    if (!window.confirm('This will add 12 sample products to your database. Continue?')) {
      return;
    }

    try {
      setError('');
      setSuccess('');

      // First, ensure owner has isActive field
      try {
        await fixOwnerActive(user.uid);
      } catch (fixError) {
        console.log('Note: Could not verify isActive field:', fixError.message);
      }

      await seedProducts();
      setSuccess('Sample products added successfully!');
      await loadData();
    } catch (err) {
      setError('Failed to seed products: ' + err.message);
    }
  };

  // Product management functions removed - stock is automatically deducted during order creation

  // Handle product export
  const handleExportProducts = () => {
    try {
      exportProducts(products);
      setSuccess('Products exported successfully!');
    } catch (err) {
      setError('Failed to export products: ' + err.message);
    }
  };

  // Handle product import
  const handleImportProducts = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setLoading(true);
      setError('');

      const importedProducts = await importProductsFromExcel(file);

      if (!window.confirm(`Import ${importedProducts.length} products? This will add them to your database.`)) {
        return;
      }

      let successCount = 0;
      let errorCount = 0;
      const errors = [];

      for (const product of importedProducts) {
        try {
          await createProduct(product);
          successCount++;
        } catch (err) {
          errorCount++;
          errors.push(`${product.sku}: ${err.message}`);
        }
      }

      if (errorCount > 0) {
        setError(`Imported ${successCount} products. ${errorCount} failed: ${errors.slice(0, 3).join(', ')}`);
      } else {
        setSuccess(`Successfully imported ${successCount} products!`);
      }

      await loadData();
    } catch (err) {
      setError('Failed to import products: ' + err.message);
    } finally {
      setLoading(false);
      event.target.value = ''; // Reset file input
    }
  };

  // Handle download template
  const handleDownloadTemplate = () => {
    try {
      downloadProductTemplate();
      setSuccess('Template downloaded successfully!');
    } catch (err) {
      setError('Failed to download template: ' + err.message);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      setError('Failed to logout: ' + err.message);
    }
  };

  // Handle view bill for an order
  const handleViewBill = async (order) => {
    try {
      setError('');

      // Check if order has new schema with items array
      const isNewSchema = order.items && Array.isArray(order.items);

      let cartItems;
      if (isNewSchema) {
        // New schema: order already has items array
        cartItems = order.items.map(item => {
          const product = products.find(p => p.id === item.productId);
          return {
            productId: item.productId,
            name: item.productName,
            sku: item.sku,
            category: item.category || product?.category || 'Unknown',
            subcategory: item.subcategory || product?.subcategory || item.category || 'Unknown',
            quantity: item.quantity,
            unitBasePrice: item.unitPrice,
            unitSalePrice: null,
            gstRate: product?.gstRate || 12,
            isTaxInclusive: product?.isTaxInclusive || false,
            isOnSale: false
          };
        });
      } else {
        // Old schema: single product order
        const product = products.find(p => p.id === order.productId);
        if (!product) {
          setError('Product not found for this order');
          return;
        }

        cartItems = [{
          productId: product.id,
          name: product.name,
          sku: product.sku,
          category: product.category,
          subcategory: product.subcategory || product.category,
          quantity: order.quantity,
          unitBasePrice: product.basePrice,
          unitSalePrice: product.isOnSale ? product.salePrice : null,
          gstRate: product.gstRate,
          isTaxInclusive: product.isTaxInclusive,
          isOnSale: product.isOnSale
        }];
      }

      // Get employee details
      const employee = users.find(u => u.id === order.createdBy);

      // Calculate order
      const orderCalculation = calculateOrder({
        items: cartItems,
        employeeDiscount: 0
      });

      // Generate bill
      const bill = generateBill(orderCalculation, {
        orderId: order.id,
        orderType: order.type,
        employeeId: order.createdBy,
        employeeName: employee?.name || employee?.email || 'Unknown',
        exhibitionId: order.exhibitionId || null,
        customer: {
          name: order.customerPhone,
          phone: order.customerPhone,
          address: ''
        }
      });

      setCurrentBill(bill);
      setShowBill(true);
    } catch (err) {
      setError('Failed to generate bill: ' + err.message);
      console.error('Bill generation error:', err);
    }
  };

  // Filter orders
  const filteredOrders = orders.filter(order => {
    if (orderTypeFilter !== 'all' && order.type !== orderTypeFilter) return false;
    if (employeeFilter !== 'all' && order.createdBy !== employeeFilter) return false;
    return true;
  });

  // Group old-schema orders that were created together (same customer, same time, same employee)
  const groupedOrders = [];
  const processedIds = new Set();

  filteredOrders.forEach(order => {
    if (processedIds.has(order.id)) return;

    // If it's new schema (has items array), just add it
    if (order.items && Array.isArray(order.items)) {
      groupedOrders.push(order);
      processedIds.add(order.id);
      return;
    }

    // For old schema, try to find related orders (same customer, within 1 minute, same employee)
    const relatedOrders = filteredOrders.filter(o =>
      !processedIds.has(o.id) &&
      o.customerPhone === order.customerPhone &&
      o.createdBy === order.createdBy &&
      o.type === order.type &&
      o.status === order.status &&
      !(o.items && Array.isArray(o.items)) && // Only old schema orders
      Math.abs((o.createdAt?.toDate?.() || new Date()).getTime() - (order.createdAt?.toDate?.() || new Date()).getTime()) < 60000 // Within 1 minute
    );

    if (relatedOrders.length > 0) {
      // Merge into one virtual order
      const mergedOrder = {
        ...order,
        items: [
          {
            productId: order.productId,
            productName: productMap[order.productId] || order.productId,
            quantity: order.quantity,
            unitPrice: order.price,
            lineTotal: order.price * order.quantity
          },
          ...relatedOrders.map(ro => ({
            productId: ro.productId,
            productName: productMap[ro.productId] || ro.productId,
            quantity: ro.quantity,
            unitPrice: ro.price,
            lineTotal: ro.price * ro.quantity
          }))
        ],
        totals: {
          payableAmount: (order.price * order.quantity) + relatedOrders.reduce((sum, ro) => sum + (ro.price * ro.quantity), 0)
        },
        _isMerged: true,
        _mergedIds: [order.id, ...relatedOrders.map(ro => ro.id)]
      };

      groupedOrders.push(mergedOrder);
      processedIds.add(order.id);
      relatedOrders.forEach(ro => processedIds.add(ro.id));
    } else {
      // Single old-schema order
      groupedOrders.push(order);
      processedIds.add(order.id);
    }
  });

  // Get unique employees from orders
  const uniqueEmployees = [...new Set(orders.map(o => o.createdBy))];

  if (loading) {
    return <div className="dashboard-loading">Loading...</div>;
  }

  return (
    <div className="owner-dashboard">
      <div className="dashboard-header">
        <div className="header-content">
          <div>
            <h1>Owner Dashboard</h1>
            <p>Welcome, {userProfile?.name || user?.email}</p>
          </div>
          <div className="header-actions">
            <button onClick={() => navigate('/owner/analytics')} className="btn btn-primary">
              View Analytics
            </button>
            <button onClick={() => navigate('/owner/users')} className="btn btn-primary">
              User Management
            </button>
            <button onClick={handleLogout} className="btn btn-logout">
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button
          className={`tab-btn ${activeTab === 'products' ? 'active' : ''}`}
          onClick={() => setActiveTab('products')}
        >
          Product Management
        </button>
        <button
          className={`tab-btn ${activeTab === 'exhibitions' ? 'active' : ''}`}
          onClick={() => setActiveTab('exhibitions')}
        >
          Exhibitions
        </button>
        <button
          className={`tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          Orders
        </button>
      </div>

      {/* Product Management Tab */}
      {activeTab === 'products' && (
        <div className="dashboard-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2>Product Management</h2>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button onClick={loadData} className="btn btn-primary">
                🔄 Refresh Stock
              </button>
              <button onClick={handleDownloadTemplate} className="btn btn-secondary">
                📥 Download Template
              </button>
              <label className="btn btn-secondary" style={{ cursor: 'pointer', margin: 0 }}>
                📤 Import Products
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleImportProducts}
                  style={{ display: 'none' }}
                />
              </label>
              <button onClick={handleExportProducts} className="btn btn-secondary">
                📊 Export Products
              </button>
              <button onClick={handleSeedProducts} className="btn btn-secondary">
                Add Sample Products
              </button>
            </div>
          </div>

          <form onSubmit={handleCreateProduct} className="product-form">
            <h3>Create New Product</h3>

            <div className="form-grid">
              {/* Left Column */}
              <div className="form-column">
                <div className="form-group">
                  <label>Product Name *</label>
                  <input
                    type="text"
                    placeholder="e.g., Classic Cotton T-Shirt"
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>SKU *</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      placeholder="e.g., MEN-TSH-001"
                      value={productForm.sku}
                      onChange={(e) => {
                        setProductForm({ ...productForm, sku: e.target.value.toUpperCase() });
                        setIsSkuManuallyEdited(true);
                      }}
                      required
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '0 10px', fontSize: '12px' }}
                      onClick={() => setIsSkuManuallyEdited(false)}
                      title="Auto-generate SKU"
                    >
                      🔄
                    </button>
                  </div>
                  <small>Unique product identifier (auto-upper case). Click 🔄 to auto-generate.</small>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Category *</label>
                    <select
                      value={productForm.category}
                      onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                      required
                    >
                      <option value="men">Men</option>
                      <option value="women">Women</option>
                      <option value="kids">Kids</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Subcategory *</label>
                    <input
                      type="text"
                      placeholder="e.g., Tshirt, Jeans, Kurti"
                      value={productForm.subcategory}
                      onChange={(e) => setProductForm({ ...productForm, subcategory: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Base Price (₹) *</label>
                    <input
                      type="number"
                      placeholder="999"
                      value={productForm.basePrice}
                      onChange={(e) => setProductForm({ ...productForm, basePrice: e.target.value })}
                      min="0"
                      step="0.01"
                      required
                    />
                    <small>GST-exclusive price</small>
                  </div>

                  <div className="form-group">
                    <label>GST Rate *</label>
                    <select
                      value={productForm.gstRate}
                      onChange={(e) => setProductForm({ ...productForm, gstRate: parseInt(e.target.value) })}
                      required
                    >
                      <option value="5">5%</option>
                      <option value="12">12%</option>
                      <option value="18">18%</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={productForm.isTaxInclusive}
                      onChange={(e) => setProductForm({ ...productForm, isTaxInclusive: e.target.checked })}
                    />
                    {' '}Tax Inclusive Price
                  </label>
                  <small>Check if base price includes GST</small>
                </div>
              </div>

              {/* Right Column */}
              <div className="form-column">
                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={productForm.isOnSale}
                      onChange={(e) => setProductForm({ ...productForm, isOnSale: e.target.checked })}
                    />
                    {' '}Product On Sale
                  </label>
                </div>

                {productForm.isOnSale && (
                  <div className="form-group">
                    <label>Sale Price (₹) *</label>
                    <input
                      type="number"
                      placeholder="Must be less than base price"
                      value={productForm.salePrice}
                      onChange={(e) => setProductForm({ ...productForm, salePrice: e.target.value })}
                      min="0"
                      step="0.01"
                      required={productForm.isOnSale}
                    />
                    <small>Must be lower than base price</small>
                  </div>
                )}

                <div className="form-row">
                  <div className="form-group">
                    <label>Stock Quantity *</label>
                    <input
                      type="number"
                      placeholder="100"
                      value={productForm.stockQty}
                      onChange={(e) => setProductForm({ ...productForm, stockQty: e.target.value })}
                      min="0"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Low Stock Alert</label>
                    <input
                      type="number"
                      placeholder="10"
                      value={productForm.lowStockThreshold}
                      onChange={(e) => setProductForm({ ...productForm, lowStockThreshold: e.target.value })}
                      min="0"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={productForm.isActive}
                      onChange={(e) => setProductForm({ ...productForm, isActive: e.target.checked })}
                    />
                    {' '}Active (visible to employees)
                  </label>
                </div>
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-lg">
              Create Product
            </button>
          </form>

          <div className="table-container">
            <h3>All Products</h3>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>SKU</th>
                  <th>Category</th>
                  <th>Base Price</th>
                  <th>Sale Price</th>
                  <th>GST</th>
                  <th>Stock</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.length === 0 ? (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '40px' }}>
                      <p>No products found. Click "Add Sample Products" to get started.</p>
                    </td>
                  </tr>
                ) : (
                  products.map(p => (
                    <tr key={p.id}>
                      <td>{p.name}</td>
                      <td><code>{p.sku}</code></td>
                      <td>{p.category}/{p.subcategory}</td>
                      <td>₹{p.basePrice}</td>
                      <td>{p.isOnSale ? `₹${p.salePrice}` : '-'}</td>
                      <td>{p.gstRate}%</td>
                      <td>
                        {p.stockQty}
                        {p.stockQty <= p.lowStockThreshold && (
                          <span style={{ color: 'red', marginLeft: '5px' }}>⚠️</span>
                        )}
                      </td>
                      <td>
                        <span className={`status-badge ${p.isActive ? 'active' : 'inactive'}`}>
                          {p.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-start' }}>
                          <button
                            onClick={() => handleEditProduct(p)}
                            className="btn btn-sm"
                            title="Edit Product"
                            style={{
                              background: '#3b82f6',
                              color: 'white',
                              border: 'none',
                              padding: '6px 12px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '13px',
                              fontWeight: '500',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                            Edit
                          </button>
                          <button
                            onClick={() => handleToggleProductActive(p.id, p.isActive)}
                            className="btn btn-sm"
                            title={p.isActive ? 'Deactivate Product' : 'Activate Product'}
                            style={{
                              background: p.isActive ? '#f59e0b' : '#10b981',
                              color: 'white',
                              border: 'none',
                              padding: '6px 12px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '13px',
                              fontWeight: '500',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                          >
                            {p.isActive ? (
                              <>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <rect x="6" y="4" width="4" height="16" />
                                  <rect x="14" y="4" width="4" height="16" />
                                </svg>
                                Pause
                              </>
                            ) : (
                              <>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <polygon points="5 3 19 12 5 21 5 3" />
                                </svg>
                                Active
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(p.id, p.name)}
                            className="btn btn-sm"
                            title="Delete Product"
                            style={{
                              background: '#ef4444',
                              color: 'white',
                              border: 'none',
                              padding: '6px 12px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '13px',
                              fontWeight: '500',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              <line x1="10" y1="11" x2="10" y2="17" />
                              <line x1="14" y1="11" x2="14" y2="17" />
                            </svg>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Exhibitions Tab */}
      {activeTab === 'exhibitions' && (
        <div className="dashboard-section">
          <h2>Exhibitions Overview</h2>
          <p className="info-text">Read-only view of all exhibitions</p>

          {exhibitions.length === 0 ? (
            <div className="empty-state">
              <p>No exhibitions recorded yet</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Location</th>
                    <th>Start Time</th>
                    <th>End Time</th>
                    <th>Created By</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {exhibitions.map(ex => (
                    <tr key={ex.id}>
                      <td>{ex.location}</td>
                      <td>{ex.startTime}</td>
                      <td>
                        {ex.endTime ?
                          new Date(ex.endTime.seconds * 1000).toLocaleString('en-IN', {
                            timeZone: 'Asia/Kolkata',
                            dateStyle: 'short',
                            timeStyle: 'short'
                          }) : 'Ongoing'}
                      </td>
                      <td>{userMap[ex.createdBy] || ex.createdBy}</td>
                      <td>
                        <span className={`status-badge ${ex.active ? 'active' : 'inactive'}`}>
                          {ex.active ? 'Active' : 'Closed'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Orders Tab */}
      {activeTab === 'orders' && (
        <div className="dashboard-section">
          <h2>Orders Overview</h2>
          <p className="info-text">Read-only view of all orders</p>

          <div className="filters">
            <select
              value={orderTypeFilter}
              onChange={(e) => setOrderTypeFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Types</option>
              <option value="daily">Store Sale</option>
              <option value="exhibition">Exhibition Sale</option>
              <option value="prebooking">Pre-Booking</option>
            </select>

            <select
              value={employeeFilter}
              onChange={(e) => setEmployeeFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Employees</option>
              {uniqueEmployees.map(empId => (
                <option key={empId} value={empId}>{userMap[empId] || empId}</option>
              ))}
            </select>
          </div>

          {groupedOrders.length === 0 ? (
            <div className="empty-state">
              <p>No orders found</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Customer Phone</th>
                    <th>Items</th>
                    <th>Total Amount</th>
                    <th>Status</th>
                    <th>Created By</th>
                    <th>Created At</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedOrders.map(order => {
                    // Handle both old and new order schema
                    const isNewSchema = order.items && Array.isArray(order.items);
                    const totalAmount = isNewSchema
                      ? order.totals?.payableAmount || order.totals?.grandTotal || 0
                      : (order.price * order.quantity);

                    return (
                      <tr key={order._isMerged ? order._mergedIds.join('-') : order.id}>
                        <td>
                          <span className="type-badge">
                            {order.type === 'daily' ? 'Store' : order.type === 'exhibition' ? 'Exhibition' : 'Pre-Booking'}
                          </span>
                        </td>
                        <td>{order.customerPhone}</td>
                        <td>
                          {isNewSchema ? (
                            <div>
                              {order.items.map((item, idx) => (
                                <div key={idx} style={{ fontSize: '12px', marginBottom: '2px' }}>
                                  {item.productName} (x{item.quantity})
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div>
                              {productMap[order.productId] || order.productId} (x{order.quantity})
                            </div>
                          )}
                        </td>
                        <td>₹{totalAmount}</td>
                        <td>
                          <span className={`status-badge ${order.status === 'completed' ? 'active' : 'inactive'}`}>
                            {order.status}
                          </span>
                        </td>
                        <td>{userMap[order.createdBy] || order.createdBy}</td>
                        <td>
                          {order.createdAt?.toDate ?
                            order.createdAt.toDate().toLocaleString('en-IN', {
                              timeZone: 'Asia/Kolkata',
                              dateStyle: 'short',
                              timeStyle: 'short'
                            }) : 'N/A'}
                        </td>
                        <td>
                          {order.status === 'completed' && (
                            <button
                              onClick={() => handleViewBill(order)}
                              className="btn-secondary"
                              style={{ fontSize: '12px', padding: '4px 8px' }}
                            >
                              📄 View Bill
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Bill Preview Modal */}
      {showBill && currentBill && (
        <BillPreview
          bill={currentBill}
          onClose={() => {
            setShowBill(false);
            setCurrentBill(null);
          }}
          onPaymentRecorded={(updatedBill) => {
            // Update current bill with payment info
            setCurrentBill(updatedBill);
            // Refresh bills list
            loadData();
          }}
        />
      )}

      {/* Edit Product Modal */}
      {showEditModal && editingProduct && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            background: 'white',
            padding: '30px',
            borderRadius: '8px',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <h2 style={{ marginTop: 0 }}>Edit Product: {editingProduct.name}</h2>

            <form onSubmit={handleUpdateProduct}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label>Product Name *</label>
                  <input
                    type="text"
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                    required
                    style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                  />
                </div>

                <div>
                  <label>SKU (Read-only)</label>
                  <input
                    type="text"
                    value={productForm.sku}
                    disabled
                    style={{ width: '100%', padding: '8px', marginTop: '5px', background: '#f0f0f0' }}
                  />
                </div>

                <div>
                  <label>Category *</label>
                  <select
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                    required
                    style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                  >
                    <option value="men">Men</option>
                    <option value="women">Women</option>
                    <option value="kids">Kids</option>
                  </select>
                </div>

                <div>
                  <label>Subcategory *</label>
                  <input
                    type="text"
                    value={productForm.subcategory}
                    onChange={(e) => setProductForm({ ...productForm, subcategory: e.target.value })}
                    required
                    style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                  />
                </div>

                <div>
                  <label>Base Price (₹) *</label>
                  <input
                    type="number"
                    value={productForm.basePrice}
                    onChange={(e) => setProductForm({ ...productForm, basePrice: e.target.value })}
                    required
                    min="0"
                    step="0.01"
                    style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                  />
                </div>

                <div>
                  <label>GST Rate *</label>
                  <select
                    value={productForm.gstRate}
                    onChange={(e) => setProductForm({ ...productForm, gstRate: parseInt(e.target.value) })}
                    required
                    style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                  >
                    <option value="5">5%</option>
                    <option value="12">12%</option>
                    <option value="18">18%</option>
                  </select>
                </div>

                <div>
                  <label>Stock Quantity *</label>
                  <input
                    type="number"
                    value={productForm.stockQty}
                    onChange={(e) => setProductForm({ ...productForm, stockQty: e.target.value })}
                    required
                    min="0"
                    style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                  />
                </div>

                <div>
                  <label>Low Stock Threshold *</label>
                  <input
                    type="number"
                    value={productForm.lowStockThreshold}
                    onChange={(e) => setProductForm({ ...productForm, lowStockThreshold: parseInt(e.target.value) })}
                    required
                    min="0"
                    style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                  />
                </div>
              </div>

              <div style={{ marginTop: '15px' }}>
                <label>
                  <input
                    type="checkbox"
                    checked={productForm.isOnSale}
                    onChange={(e) => setProductForm({ ...productForm, isOnSale: e.target.checked })}
                  />
                  {' '}On Sale
                </label>
              </div>

              {productForm.isOnSale && (
                <div style={{ marginTop: '10px' }}>
                  <label>Sale Price (₹) *</label>
                  <input
                    type="number"
                    value={productForm.salePrice}
                    onChange={(e) => setProductForm({ ...productForm, salePrice: e.target.value })}
                    required
                    min="0"
                    step="0.01"
                    style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                  />
                </div>
              )}

              <div style={{ marginTop: '15px' }}>
                <label>
                  <input
                    type="checkbox"
                    checked={productForm.isActive}
                    onChange={(e) => setProductForm({ ...productForm, isActive: e.target.checked })}
                  />
                  {' '}Active
                </label>
              </div>

              <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingProduct(null);
                  }}
                  className="btn btn-secondary"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Updating...' : 'Update Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OwnerDashboard;
