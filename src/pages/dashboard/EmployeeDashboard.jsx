import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getActiveProducts } from '../../services/productService';
import { getActiveExhibition, startExhibition, endExhibition } from '../../services/exhibitionService';
import { createOrder, getPendingPreBookings, convertPreBookingToSale } from '../../services/orderService';
import { getCustomerByPhone, createOrUpdateCustomer } from '../../services/customerService';
import { calculateOrder } from '../../services/orderCalculationService';
import { generateBill } from '../../services/billingService';
import { saveBill, getTodaysBills } from '../../services/billStorageService';
import { deductStockBatch } from '../../services/productService';
import BillPreview from '../../components/billing/BillPreview';
import '../../styles/EmployeeDashboard.css';

const EmployeeDashboard = () => {
  const { user, userProfile, logout } = useAuth();
  const navigate = useNavigate();
  
  const [products, setProducts] = useState([]);
  const [activeExhibition, setActiveExhibition] = useState(null);
  const [preBookings, setPreBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [currentBill, setCurrentBill] = useState(null);
  const [showBill, setShowBill] = useState(false);
  const [todaysBills, setTodaysBills] = useState([]);
  
  // Cart state for multi-product orders
  const [cart, setCart] = useState([]);
  
  const [orderType, setOrderType] = useState('store');
  const [formData, setFormData] = useState({
    customerPhone: '',
    customerName: '',
    customerAddress: '',
    customerGender: '',
    customerAgeGroup: '',
    deliveryDate: ''
  });
  
  // Product selection state
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  
  const [exhibitionForm, setExhibitionForm] = useState({
    location: '',
    startTime: ''
  });

  const [showExhibitionForm, setShowExhibitionForm] = useState(false);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const [productsData, exhibitionData, preBookingsData] = await Promise.all([
        getActiveProducts(),
        getActiveExhibition(user.uid),
        getPendingPreBookings()
      ]);
      
      setProducts(productsData);
      setActiveExhibition(exhibitionData);
      setPreBookings(preBookingsData);
      
      // Load bills separately to avoid blocking other data
      try {
        const billsData = await getTodaysBills(user.uid);
        setTodaysBills(billsData);
      } catch (billError) {
        console.error('Error loading bills:', billError);
        // Don't fail the whole load if bills fail
        setTodaysBills([]);
      }
    } catch (err) {
      // Only show error if it's not a "no products" scenario
      if (!err.message.includes('Missing or insufficient permissions')) {
        setError('Failed to load data: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStartExhibition = async (e) => {
    e.preventDefault();
    
    try {
      setError('');
      setSuccess('');
      
      if (!exhibitionForm.location || !exhibitionForm.startTime) {
        setError('Please fill in all exhibition fields');
        return;
      }
      
      await startExhibition({
        location: exhibitionForm.location,
        startTime: exhibitionForm.startTime,
        createdBy: user.uid
      });
      
      setSuccess('Exhibition started successfully!');
      setExhibitionForm({ location: '', startTime: '' });
      setShowExhibitionForm(false);
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEndExhibition = async () => {
    if (!activeExhibition) return;
    
    try {
      setError('');
      setSuccess('');
      
      await endExhibition(activeExhibition.id);
      setSuccess('Exhibition ended successfully!');
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  // Add product to cart
  const handleAddToCart = () => {
    if (!selectedProductId) {
      setError('Please select a product');
      return;
    }
    
    if (selectedQuantity <= 0) {
      setError('Quantity must be at least 1');
      return;
    }
    
    const product = products.find(p => p.id === selectedProductId);
    if (!product) {
      setError('Product not found');
      return;
    }
    
    // Check if product already in cart
    const existingIndex = cart.findIndex(item => item.productId === selectedProductId);
    
    if (existingIndex >= 0) {
      // Update quantity
      const newCart = [...cart];
      newCart[existingIndex].quantity += selectedQuantity;
      setCart(newCart);
    } else {
      // Add new item with complete structure required by orderCalculationService
      setCart([...cart, {
        productId: product.id,
        name: product.name,
        sku: product.sku,
        category: product.category,
        subcategory: product.subcategory || product.category,
        quantity: selectedQuantity,
        unitBasePrice: product.basePrice,  // Changed from basePrice
        unitSalePrice: product.isOnSale ? product.salePrice : null,  // Changed from salePrice
        gstRate: product.gstRate,
        isTaxInclusive: product.isTaxInclusive,
        isOnSale: product.isOnSale
      }]);
    }
    
    // Reset selection
    setSelectedProductId('');
    setSelectedQuantity(1);
    setError('');
  };

  // Remove item from cart
  const handleRemoveFromCart = (productId) => {
    setCart(cart.filter(item => item.productId !== productId));
  };

  // Update cart item quantity
  const handleUpdateCartQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      handleRemoveFromCart(productId);
      return;
    }
    
    setCart(cart.map(item => 
      item.productId === productId 
        ? { ...item, quantity: newQuantity }
        : item
    ));
  };

  // Clear cart
  const handleClearCart = () => {
    setCart([]);
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    
    try {
      setError('');
      setSuccess('');
      
      if (!formData.customerPhone || !formData.customerName) {
        setError('Please fill in customer information');
        return;
      }
      
      if (cart.length === 0) {
        setError('Please add at least one product to cart');
        return;
      }
      
      if (orderType === 'prebooking' && !formData.deliveryDate) {
        setError('Delivery date is required for pre-bookings');
        return;
      }
      
      if (orderType === 'exhibition' && !activeExhibition) {
        setError('Start an exhibition to create exhibition sales');
        return;
      }
      
      await createOrUpdateCustomer({
        phone: formData.customerPhone,
        name: formData.customerName,
        address: formData.customerAddress,
        gender: formData.customerGender,
        ageGroup: formData.customerAgeGroup
      });
      
      let finalOrderType = orderType;
      let exhibitionId = null;
      
      if (orderType === 'store') {
        finalOrderType = 'daily';
        exhibitionId = null;
      } else if (orderType === 'exhibition') {
        finalOrderType = 'exhibition';
        exhibitionId = activeExhibition.id;
      } else if (orderType === 'prebooking') {
        finalOrderType = 'prebooking';
        exhibitionId = null;
      }
      
      // Generate bill FIRST for completed orders (not pre-bookings)
      let bill = null;
      if (orderType !== 'prebooking') {
        try {
          // Calculate order
          const orderCalculation = calculateOrder({
            items: cart,
            employeeDiscount: 0
          });
          
          console.log('Order calculation:', orderCalculation);
          
          // Generate bill
          bill = generateBill(orderCalculation, {
            orderId: 'TEMP-' + Date.now(), // Temporary ID, will update after order creation
            orderType: finalOrderType,
            employeeId: user.uid,
            employeeName: userProfile?.name || user.email,
            exhibitionId: exhibitionId,
            customer: {
              name: formData.customerName,
              phone: formData.customerPhone,
              address: formData.customerAddress || ''
            }
          });
          
          console.log('Generated bill:', bill);
        } catch (billError) {
          console.error('Bill generation error:', billError);
          throw new Error('Bill generation failed: ' + billError.message);
        }
      }
      
      // Only create orders if bill generation succeeded (or if it's a pre-booking)
      // Deduct stock for completed orders (not pre-bookings)
      if (orderType !== 'prebooking') {
        try {
          const stockItems = cart.map(item => ({
            productId: item.productId,
            quantity: item.quantity
          }));
          
          console.log('Attempting to deduct stock for items:', stockItems);
          const stockResults = await deductStockBatch(stockItems);
          console.log('✅ Stock deducted successfully:', stockResults);
        } catch (stockError) {
          console.error('❌ Stock deduction error:', stockError);
          throw new Error(`Stock deduction failed: ${stockError.message}`);
        }
      } else {
        console.log('⏭️ Skipping stock deduction for pre-booking');
      }
      
      const orderData = {
        type: finalOrderType,
        customerPhone: formData.customerPhone,
        items: cart.map(cartItem => ({
          productId: cartItem.productId,
          productName: cartItem.name,
          sku: cartItem.sku,
          category: cartItem.category,
          quantity: cartItem.quantity,
          unitPrice: cartItem.unitSalePrice || cartItem.unitBasePrice,
          lineTotal: (cartItem.unitSalePrice || cartItem.unitBasePrice) * cartItem.quantity
        })),
        totals: bill ? {
          subtotal: bill.totals.subtotal,
          totalCGST: bill.totals.totalCGST,
          totalSGST: bill.totals.totalSGST,
          totalTax: bill.totals.totalTax,
          grandTotal: bill.totals.grandTotal,
          payableAmount: bill.totals.payableAmount
        } : null,
        status: orderType === 'prebooking' ? 'pending' : 'completed',
        exhibitionId,
        createdBy: user.uid,
        deliveryDate: orderType === 'prebooking' ? formData.deliveryDate : null,
        billId: bill ? bill.billNumber : null
      };
      
      const createdOrder = await createOrder(orderData);
      
      // Show bill preview and save if generated
      if (bill) {
        // Update bill with actual order ID
        bill.orderId = createdOrder?.id || bill.orderId;
        
        // Save bill to Firestore
        try {
          const billId = await saveBill(bill);
          console.log('Bill saved to Firestore with ID:', billId);
          
          // Reload today's bills to show the new bill
          try {
            const updatedBills = await getTodaysBills(user.uid);
            setTodaysBills(updatedBills);
          } catch (reloadError) {
            console.error('Failed to reload bills:', reloadError);
          }
        } catch (saveError) {
          console.error('Failed to save bill:', saveError);
          // Don't fail the whole operation if bill save fails
        }
        
        setCurrentBill(bill);
        setShowBill(true);
        console.log('Showing bill preview');
      }
      
      const orderTypeLabel = orderType === 'store' ? 'Store Sale' : 
                            orderType === 'exhibition' ? 'Exhibition Sale' : 
                            'Pre-booking';
      setSuccess(`${orderTypeLabel} created successfully!`);
      
      await loadData();
      
      // Reset form and cart ONLY after successful completion
      setFormData({
        customerPhone: '',
        customerName: '',
        customerAddress: '',
        customerGender: '',
        customerAgeGroup: '',
        deliveryDate: ''
      });
      setCart([]);
      
    } catch (err) {
      // DON'T clear form on error - let user see what they entered
      setError('Failed to create order: ' + err.message);
      console.error('Order creation error:', err);
    }
  };

  const handlePhoneChange = async (e) => {
    const phone = e.target.value;
    setFormData({...formData, customerPhone: phone});
    
    if (phone.length >= 10) {
      try {
        const customer = await getCustomerByPhone(phone);
        if (customer) {
          setFormData({
            ...formData,
            customerPhone: phone,
            customerName: customer.name || '',
            customerAddress: customer.address || '',
            customerGender: customer.gender || '',
            customerAgeGroup: customer.ageGroup || ''
          });
        }
      } catch (err) {
        console.error('Error fetching customer:', err);
      }
    }
  };

  const handleConvertPreBooking = async (preBookingId) => {
    try {
      setError('');
      setSuccess('');
      
      const exhibitionId = activeExhibition ? activeExhibition.id : null;
      
      await convertPreBookingToSale(preBookingId, exhibitionId);
      
      setSuccess('Pre-booking converted to sale successfully!');
      await loadData();
    } catch (err) {
      setError('Failed to convert pre-booking: ' + err.message);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      setError('Failed to logout: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="emp-dashboard">
        <div className="emp-loading">
          <div className="loading-spinner"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="emp-dashboard">
      {/* Top Navigation */}
      <nav className="emp-nav">
        <div className="emp-nav-content">
          <div className="emp-nav-left">
            <div className="emp-brand">
              <div className="emp-brand-mark">R</div>
              <span className="emp-brand-name">RetailOps</span>
            </div>
          </div>
          <div className="emp-nav-right">
            <div className="emp-user">
              <div className="emp-user-avatar">
                {userProfile?.name?.charAt(0).toUpperCase() || 'E'}
              </div>
              <span className="emp-user-name">{userProfile?.name || user?.email}</span>
            </div>
            <button onClick={() => navigate('/employee/analytics')} className="emp-nav-btn emp-nav-btn-primary">
              View Analytics
            </button>
            <button onClick={handleLogout} className="emp-nav-btn">
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="emp-content">
        {/* Messages */}
        {error && (
          <div className="emp-alert emp-alert-error">
            <span className="emp-alert-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </span>
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="emp-alert emp-alert-success">
            <span className="emp-alert-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </span>
            <span>{success}</span>
          </div>
        )}

        {/* Exhibition Status Banner */}
        <div className={`emp-exhibition-banner ${activeExhibition ? 'active' : 'inactive'}`}>
          <div className="emp-exhibition-content">
            <div className="emp-exhibition-icon">
              {activeExhibition ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  <polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
              )}
            </div>
            <div className="emp-exhibition-info">
              {activeExhibition ? (
                <>
                  <h3>Exhibition Active</h3>
                  <p>
                    {activeExhibition.location} • Started {
                      new Date(activeExhibition.startTime).toLocaleString('en-IN', {
                        timeZone: 'Asia/Kolkata',
                        dateStyle: 'short',
                        timeStyle: 'short'
                      })
                    }
                  </p>
                </>
              ) : (
                <>
                  <h3>No Active Exhibition</h3>
                  <p>Start an exhibition to enable exhibition sales</p>
                </>
              )}
            </div>
          </div>
          <div className="emp-exhibition-actions">
            {activeExhibition ? (
              <button onClick={handleEndExhibition} className="emp-btn emp-btn-danger">
                End Exhibition
              </button>
            ) : (
              <button onClick={() => setShowExhibitionForm(!showExhibitionForm)} className="emp-btn emp-btn-secondary">
                {showExhibitionForm ? 'Cancel' : 'Start Exhibition'}
              </button>
            )}
          </div>
        </div>

        {/* Exhibition Form (Collapsible) */}
        {showExhibitionForm && !activeExhibition && (
          <div className="emp-card emp-exhibition-form-card">
            <h3 className="emp-card-title">Start New Exhibition</h3>
            <form onSubmit={handleStartExhibition} className="emp-form">
              <div className="emp-form-row">
                <div className="emp-form-group">
                  <label className="emp-label">Location</label>
                  <input
                    type="text"
                    className="emp-input"
                    value={exhibitionForm.location}
                    onChange={(e) => setExhibitionForm({...exhibitionForm, location: e.target.value})}
                    placeholder="e.g., Mumbai Central Mall"
                    required
                  />
                </div>
                <div className="emp-form-group">
                  <label className="emp-label">Start Time</label>
                  <input
                    type="datetime-local"
                    className="emp-input"
                    value={exhibitionForm.startTime}
                    onChange={(e) => setExhibitionForm({...exhibitionForm, startTime: e.target.value})}
                    required
                  />
                </div>
              </div>
              <button type="submit" className="emp-btn emp-btn-primary">
                Start Exhibition
              </button>
            </form>
          </div>
        )}

        {/* Main Content */}
        <div className="emp-main-content">
          {/* Order Creation */}
          <div className="emp-card">
            <h2 className="emp-section-title">Create Order</h2>
              
              {/* Order Type Pills */}
              <div className="emp-order-types">
                <button
                  className={`emp-order-type ${orderType === 'store' ? 'active' : ''}`}
                  onClick={() => setOrderType('store')}
                >
                  <span className="emp-order-type-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                      <polyline points="9 22 9 12 15 12 15 22"/>
                    </svg>
                  </span>
                  <span className="emp-order-type-label">Store Sale</span>
                </button>
                <button
                  className={`emp-order-type ${orderType === 'exhibition' ? 'active' : ''}`}
                  onClick={() => setOrderType('exhibition')}
                  disabled={!activeExhibition}
                >
                  <span className="emp-order-type-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                    </svg>
                  </span>
                  <span className="emp-order-type-label">Exhibition Sale</span>
                  {!activeExhibition && <span className="emp-order-type-badge">Requires Exhibition</span>}
                </button>
                <button
                  className={`emp-order-type ${orderType === 'prebooking' ? 'active' : ''}`}
                  onClick={() => setOrderType('prebooking')}
                >
                  <span className="emp-order-type-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                      <line x1="16" y1="2" x2="16" y2="6"/>
                      <line x1="8" y1="2" x2="8" y2="6"/>
                      <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                  </span>
                  <span className="emp-order-type-label">Pre-Booking</span>
                </button>
              </div>

              {/* Order Form */}
              <form onSubmit={handleCreateOrder} className="emp-form">
                <div className="emp-form-grid">
                  {/* Left Column - Customer Section */}
                  <div className="emp-form-column">
                    <h4 className="emp-form-section-title">Customer Information</h4>
                    
                    <div className="emp-form-group">
                      <label className="emp-label">Phone Number *</label>
                      <input
                        type="tel"
                        className="emp-input"
                        value={formData.customerPhone}
                        onChange={handlePhoneChange}
                        placeholder="10-digit phone number"
                        required
                      />
                      <span className="emp-helper">Auto-fills existing customer data</span>
                    </div>

                    <div className="emp-form-group">
                      <label className="emp-label">Customer Name *</label>
                      <input
                        type="text"
                        className="emp-input"
                        value={formData.customerName}
                        onChange={(e) => setFormData({...formData, customerName: e.target.value})}
                        placeholder="Full name"
                        required
                      />
                    </div>

                    <div className="emp-form-group">
                      <label className="emp-label">Address</label>
                      <input
                        type="text"
                        className="emp-input"
                        value={formData.customerAddress}
                        onChange={(e) => setFormData({...formData, customerAddress: e.target.value})}
                        placeholder="Optional"
                      />
                    </div>

                    <div className="emp-form-row">
                      <div className="emp-form-group">
                        <label className="emp-label">Gender</label>
                        <select
                          className="emp-select"
                          value={formData.customerGender}
                          onChange={(e) => setFormData({...formData, customerGender: e.target.value})}
                        >
                          <option value="">Select</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      <div className="emp-form-group">
                        <label className="emp-label">Age Group</label>
                        <select
                          className="emp-select"
                          value={formData.customerAgeGroup}
                          onChange={(e) => setFormData({...formData, customerAgeGroup: e.target.value})}
                        >
                          <option value="">Select</option>
                          <option value="0-12">0-12 (Kids)</option>
                          <option value="13-19">13-19 (Teens)</option>
                          <option value="20-35">20-35 (Young Adults)</option>
                          <option value="36-50">36-50 (Adults)</option>
                          <option value="51+">51+ (Seniors)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Right Column - Product Section */}
                  <div className="emp-form-column">
                    <h4 className="emp-form-section-title">Add Products to Cart</h4>
                    
                    <div className="emp-form-group">
                      <label className="emp-label">Select Product *</label>
                      {products.length === 0 ? (
                        <div className="emp-empty-state">
                          <p>No products available. Contact owner to add products.</p>
                        </div>
                      ) : (
                        <select
                          className="emp-select"
                          value={selectedProductId}
                          onChange={(e) => setSelectedProductId(e.target.value)}
                        >
                          <option value="">Select product</option>
                          {products.map(product => (
                            <option key={product.id} value={product.id}>
                              {product.name} - ₹{product.isOnSale ? product.salePrice : product.basePrice}
                              {product.isOnSale && ' (SALE)'}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    <div className="emp-form-row">
                      <div className="emp-form-group">
                        <label className="emp-label">Quantity</label>
                        <input
                          type="number"
                          className="emp-input"
                          value={selectedQuantity}
                          onChange={(e) => setSelectedQuantity(parseInt(e.target.value) || 1)}
                          min="1"
                        />
                      </div>

                      <div className="emp-form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
                        <button
                          type="button"
                          onClick={handleAddToCart}
                          className="emp-btn emp-btn-secondary"
                          disabled={!selectedProductId}
                        >
                          ➕ Add to Cart
                        </button>
                      </div>
                    </div>

                    {/* Cart Display */}
                    {cart.length > 0 && (
                      <div className="emp-cart-display" style={{ marginTop: '16px', padding: '12px', background: '#f8fafc', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <h5 style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}>Cart ({cart.length} items)</h5>
                          <button
                            type="button"
                            onClick={handleClearCart}
                            className="emp-btn emp-btn-sm"
                            style={{ fontSize: '11px', padding: '4px 8px' }}
                          >
                            Clear All
                          </button>
                        </div>
                        {cart.map((item, index) => {
                          const effectivePrice = item.unitSalePrice || item.unitBasePrice;
                          const itemTotal = effectivePrice * item.quantity;
                          const discount = item.unitSalePrice ? (item.unitBasePrice - item.unitSalePrice) * item.quantity : 0;
                          
                          return (
                            <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', background: 'white', borderRadius: '4px', marginBottom: '4px' }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '13px', fontWeight: '500' }}>
                                  {item.name}
                                  {item.unitSalePrice && <span style={{ marginLeft: '6px', fontSize: '10px', background: '#10b981', color: 'white', padding: '2px 6px', borderRadius: '3px' }}>SALE</span>}
                                </div>
                                <div style={{ fontSize: '11px', color: '#64748b' }}>
                                  {item.unitSalePrice && (
                                    <span style={{ textDecoration: 'line-through', marginRight: '6px' }}>₹{item.unitBasePrice}</span>
                                  )}
                                  ₹{effectivePrice} × {item.quantity} = ₹{itemTotal.toFixed(2)}
                                  {discount > 0 && <span style={{ color: '#10b981', marginLeft: '6px' }}>(Save ₹{discount.toFixed(2)})</span>}
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateCartQuantity(item.productId, item.quantity - 1)}
                                  style={{ padding: '2px 6px', fontSize: '12px', background: '#e2e8f0', border: 'none', borderRadius: '3px', cursor: 'pointer' }}
                                >
                                  −
                                </button>
                                <span style={{ fontSize: '12px', minWidth: '20px', textAlign: 'center' }}>{item.quantity}</span>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateCartQuantity(item.productId, item.quantity + 1)}
                                  style={{ padding: '2px 6px', fontSize: '12px', background: '#e2e8f0', border: 'none', borderRadius: '3px', cursor: 'pointer' }}
                                >
                                  +
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveFromCart(item.productId)}
                                  style={{ padding: '2px 6px', fontSize: '12px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '3px', cursor: 'pointer', marginLeft: '4px' }}
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                          );
                        })}
                        
                        {/* Cart Summary with GST */}
                        {(() => {
                          try {
                            const orderCalc = calculateOrder({ items: cart, employeeDiscount: 0 });
                            return (
                              <div style={{ marginTop: '12px', padding: '12px', background: 'white', borderRadius: '4px', border: '2px solid #0f172a' }}>
                                <div style={{ fontSize: '12px', marginBottom: '6px' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                    <span>Subtotal:</span>
                                    <span>₹{orderCalc.summary.subtotal.toFixed(2)}</span>
                                  </div>
                                  {orderCalc.summary.totalDiscount > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', color: '#10b981' }}>
                                      <span>Discount:</span>
                                      <span>- ₹{orderCalc.summary.totalDiscount.toFixed(2)}</span>
                                    </div>
                                  )}
                                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                    <span>CGST:</span>
                                    <span>₹{orderCalc.summary.totalCGST.toFixed(2)}</span>
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                    <span>SGST:</span>
                                    <span>₹{orderCalc.summary.totalSGST.toFixed(2)}</span>
                                  </div>
                                  <div style={{ borderTop: '1px solid #e2e8f0', marginTop: '6px', paddingTop: '6px', display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: '700' }}>
                                    <span>Total Amount:</span>
                                    <span>₹{Math.round(orderCalc.summary.grandTotal)}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          } catch (err) {
                            return (
                              <div style={{ marginTop: '12px', padding: '8px', background: '#fee2e2', color: '#dc2626', borderRadius: '4px', fontSize: '11px' }}>
                                Error calculating total: {err.message}
                              </div>
                            );
                          }
                        })()}
                      </div>
                    )}

                    {orderType === 'prebooking' && (
                      <div className="emp-form-group" style={{ marginTop: '16px' }}>
                        <label className="emp-label">Delivery Date *</label>
                        <input
                          type="date"
                          className="emp-input"
                          value={formData.deliveryDate}
                          onChange={(e) => setFormData({...formData, deliveryDate: e.target.value})}
                          required
                        />
                      </div>
                    )}
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="emp-btn emp-btn-primary emp-btn-lg emp-btn-block"
                  disabled={cart.length === 0 || (orderType === 'exhibition' && !activeExhibition)}
                >
                  {orderType === 'prebooking' ? 'Create Pre-Booking' : 
                   orderType === 'exhibition' ? 'Create Exhibition Sale' : 
                   'Create Store Sale'}
                </button>
              </form>
            </div>

          {/* Pre-Bookings Section */}
          {preBookings.length > 0 && (
            <div className="emp-card">
              <div className="emp-card-header">
                <div>
                  <h3 className="emp-card-title">Pending Pre-Bookings</h3>
                  <p className="emp-card-subtitle">{preBookings.length} awaiting conversion</p>
                </div>
              </div>
              
              <div className="emp-prebookings-grid">
                {preBookings.map(booking => (
                  <div key={booking.id} className="emp-prebooking-card">
                    <div className="emp-prebooking-header">
                      <span className="emp-prebooking-phone">{booking.customerPhone}</span>
                      <span className="emp-badge emp-badge-warning">Pending</span>
                    </div>
                    <div className="emp-prebooking-details">
                      <div className="emp-prebooking-row">
                        <span className="emp-prebooking-label">Product</span>
                        <span className="emp-prebooking-value">{booking.productId}</span>
                      </div>
                      <div className="emp-prebooking-row">
                        <span className="emp-prebooking-label">Amount</span>
                        <span className="emp-prebooking-value">₹{booking.price}</span>
                      </div>
                      <div className="emp-prebooking-row">
                        <span className="emp-prebooking-label">Delivery</span>
                        <span className="emp-prebooking-value">{booking.deliveryDate}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleConvertPreBooking(booking.id)}
                      className="emp-btn emp-btn-success emp-btn-sm emp-btn-block"
                    >
                      Convert to Sale
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Today's Sales Section */}
          {todaysBills.length > 0 && (
            <div className="emp-card">
              <div className="emp-card-header">
                <div>
                  <h3 className="emp-card-title">Today's Sales</h3>
                  <p className="emp-card-subtitle">{todaysBills.length} bills generated today</p>
                </div>
              </div>
              
              <div className="emp-prebookings-grid">
                {todaysBills.map(bill => (
                  <div key={bill.id} className="emp-prebooking-card">
                    <div className="emp-prebooking-header">
                      <span className="emp-prebooking-phone">{bill.billNumber}</span>
                      <span className="emp-badge emp-badge-success">Completed</span>
                    </div>
                    <div className="emp-prebooking-details">
                      <div className="emp-prebooking-row">
                        <span className="emp-prebooking-label">Customer</span>
                        <span className="emp-prebooking-value">{bill.customer?.name || 'N/A'}</span>
                      </div>
                      <div className="emp-prebooking-row">
                        <span className="emp-prebooking-label">Phone</span>
                        <span className="emp-prebooking-value">{bill.customer?.phone || 'N/A'}</span>
                      </div>
                      <div className="emp-prebooking-row">
                        <span className="emp-prebooking-label">Amount</span>
                        <span className="emp-prebooking-value">₹{bill.totals?.payableAmount || 0}</span>
                      </div>
                      <div className="emp-prebooking-row">
                        <span className="emp-prebooking-label">Time</span>
                        <span className="emp-prebooking-value">
                          {(() => {
                            if (!bill.billDate) return 'N/A';
                            
                            let date;
                            // Handle Firestore Timestamp
                            if (bill.billDate.toDate && typeof bill.billDate.toDate === 'function') {
                              date = bill.billDate.toDate();
                            } else {
                              date = new Date(bill.billDate);
                            }
                            
                            // Check if date is valid
                            if (isNaN(date.getTime())) return 'Invalid Date';
                            
                            // Convert to IST manually (UTC + 5:30)
                            const istOffset = 5.5 * 60 * 60 * 1000;
                            const istDate = new Date(date.getTime() + istOffset);
                            
                            let hours = istDate.getUTCHours();
                            const minutes = istDate.getUTCMinutes().toString().padStart(2, '0');
                            const ampm = hours >= 12 ? 'pm' : 'am';
                            hours = hours % 12 || 12;
                            
                            return `${hours}:${minutes} ${ampm}`;
                          })()}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setCurrentBill(bill);
                        setShowBill(true);
                      }}
                      className="emp-btn emp-btn-primary emp-btn-sm emp-btn-block"
                    >
                      View Bill
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bill Preview Modal */}
      {showBill && currentBill && (
        <BillPreview 
          bill={currentBill} 
          onClose={() => {
            setShowBill(false);
            setCurrentBill(null);
          }} 
        />
      )}
    </div>
  );
};

export default EmployeeDashboard;
