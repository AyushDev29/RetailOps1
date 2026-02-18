import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useView } from '../../contexts/ViewContext';
import { getActiveProducts } from '../../services/productService';
import { getAllActiveExhibitions } from '../../services/exhibitionService';
import { createOrder, getPendingPreBookings, convertPreBookingToSale } from '../../services/orderService';
import { getCustomerByPhone, createOrUpdateCustomer } from '../../services/customerService';
import { calculateOrder } from '../../services/orderCalculationService';
import { generateBill } from '../../services/billingService';
import { saveBill, getTodaysBills } from '../../services/billStorageService';
import { deductStockBatch } from '../../services/productService';
import { recordPayment } from '../../services/paymentService';
import BillPreview from '../../components/billing/BillPreview';
import ProductSearchInput from '../../components/common/ProductSearchInput';
import '../../styles/EmployeeDashboard.css';

const EmployeeDashboard = () => {
  const { user, userProfile, logout } = useAuth();
  const { navigateToView, VIEWS } = useView();
  
  const [products, setProducts] = useState([]);
  const [activeExhibitions, setActiveExhibitions] = useState([]);
  const [selectedExhibition, setSelectedExhibition] = useState('');
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
  
  // Handle product selection from search
  const handleProductSelect = (product) => {
    if (!product) return;
    
    // Check if product already in cart
    const existingIndex = cart.findIndex(item => item.productId === product.id);
    
    if (existingIndex >= 0) {
      // Update quantity by 1
      const updatedCart = [...cart];
      updatedCart[existingIndex].quantity += 1;
      setCart(updatedCart);
    } else {
      // Add new item with quantity 1
      setCart([...cart, {
        productId: product.id,
        name: product.name,  // orderCalculationService expects 'name', not 'productName'
        sku: product.sku,    // orderCalculationService expects 'sku', not 'productSKU'
        quantity: 1,
        unitBasePrice: product.basePrice,
        unitSalePrice: product.isOnSale ? product.salePrice : null,
        gstRate: product.gstRate,
        isTaxInclusive: product.isTaxInclusive,
        category: product.category
      }]);
    }
    
    setError('');
  };

  // Payment recording state (STEP 6)
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentReferenceId, setPaymentReferenceId] = useState('');

  // Clean up invalid cart items on mount
  useEffect(() => {
    if (cart.length > 0) {
      const validItems = cart.filter(item => 
        item.name && 
        item.sku && 
        typeof item.unitBasePrice === 'number' &&
        typeof item.gstRate === 'number' &&
        typeof item.isTaxInclusive === 'boolean'
      );
      
      if (validItems.length !== cart.length) {
        console.warn('Cleaning up invalid cart items on mount');
        setCart(validItems);
      }
    }
  }, []); // Run once on mount

  useEffect(() => {
    loadData();
  }, [user]);

  // Auto-update payment amount when cart changes (STEP 6)
  useEffect(() => {
    if (cart.length > 0 && orderType !== 'prebooking') {
      try {
        // Validate that all cart items have required fields
        const allItemsValid = cart.every(item => {
          const isValid = 
            item.name && 
            item.sku && 
            typeof item.unitBasePrice === 'number' &&
            typeof item.gstRate === 'number' &&
            typeof item.isTaxInclusive === 'boolean';
          
          if (!isValid) {
            console.warn('Invalid cart item:', item);
          }
          return isValid;
        });

        if (allItemsValid) {
          const orderCalc = calculateOrder({ items: cart, employeeDiscount: 0 });
          const totalAmount = Math.round(orderCalc.summary.grandTotal);
          setPaymentAmount(totalAmount.toString());
        } else {
          // Cart has invalid items, clear it
          console.warn('Cart has invalid items, clearing cart');
          setCart([]);
          setPaymentAmount('');
        }
      } catch (err) {
        console.error('Error calculating payment amount:', err);
        setPaymentAmount('');
      }
    } else {
      setPaymentAmount('');
    }
  }, [cart, orderType]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const [productsData, exhibitionsData, preBookingsData] = await Promise.all([
        getActiveProducts(),
        getAllActiveExhibitions(),
        getPendingPreBookings()
      ]);
      
      setProducts(productsData);
      setActiveExhibitions(exhibitionsData);
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

      // Validate phone number is exactly 10 digits
      if (formData.customerPhone.length !== 10) {
        setError('Phone number must be exactly 10 digits');
        return;
      }

      // CRITICAL: Ensure customer name is not the phone number
      if (formData.customerName === formData.customerPhone || /^\d{10,}$/.test(formData.customerName)) {
        setError('Customer name cannot be a phone number. Please enter the actual name.');
        return;
      }

      // Validate customer name is at least 2 characters
      if (formData.customerName.trim().length < 2) {
        setError('Please enter a valid customer name (at least 2 characters)');
        return;
      }

      // Validate Gender and Age Group are selected
      if (!formData.customerGender) {
        setError('Please select customer gender');
        return;
      }

      if (!formData.customerAgeGroup) {
        setError('Please select customer age group');
        return;
      }
      
      if (cart.length === 0) {
        setError('Please add at least one product to cart');
        return;
      }

      // Validate cart items have all required fields
      const invalidItems = cart.filter(item => 
        !item.name || 
        !item.sku || 
        typeof item.unitBasePrice !== 'number' ||
        typeof item.gstRate !== 'number' ||
        typeof item.isTaxInclusive !== 'boolean'
      );

      if (invalidItems.length > 0) {
        console.error('Invalid cart items:', invalidItems);
        setError('Cart contains invalid items. Please clear cart and add products again.');
        return;
      }
      
      if (orderType === 'prebooking' && !formData.deliveryDate) {
        setError('Delivery date is required for pre-bookings');
        return;
      }
      
      if (orderType === 'exhibition' && !selectedExhibition) {
        setError('Please select an exhibition');
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
        exhibitionId = selectedExhibition;
      } else if (orderType === 'prebooking') {
        finalOrderType = 'prebooking';
        exhibitionId = null;
      }
      
      // Generate bill for ALL order types (including pre-bookings)
      let bill = null;
      try {
        // Validate cart items before processing
        const invalidItems = cart.filter(item => 
          !item.name || 
          !item.sku || 
          typeof item.unitBasePrice !== 'number' ||
          typeof item.gstRate !== 'number' ||
          typeof item.isTaxInclusive !== 'boolean'
        );

        if (invalidItems.length > 0) {
          console.error('Invalid cart items found:', invalidItems);
          throw new Error('Cart contains invalid items. Please remove them and try again.');
        }

        console.log('Cart items being processed:', cart);
        console.log('Customer data:', {
          name: formData.customerName,
          phone: formData.customerPhone,
          address: formData.customerAddress
        });

        // Calculate order
        const orderCalculation = calculateOrder({
          items: cart,
          employeeDiscount: 0
        });
        
        console.log('Order calculation:', orderCalculation);
        
        // Get exhibition location if this is an exhibition sale
        let exhibitionLocation = null;
        if (orderType === 'exhibition' && selectedExhibition) {
          const exhibition = activeExhibitions.find(ex => ex.id === selectedExhibition);
          exhibitionLocation = exhibition?.location || null;
        }
        
        // Generate bill for all order types
        bill = generateBill(orderCalculation, {
          orderId: 'TEMP-' + Date.now(), // Temporary ID, will update after order creation
          orderType: finalOrderType,
          employeeId: user.uid,
          employeeName: userProfile?.name || user.email,
          exhibitionId: exhibitionId,
          exhibitionLocation: exhibitionLocation,
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
      
      // Deduct stock only for completed orders (NOT for pre-bookings)
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
      
      // Calculate totals for pre-bookings (even though no bill is generated)
      let totals = null;
      if (bill) {
        totals = {
          subtotal: bill.totals.subtotal,
          totalCGST: bill.totals.totalCGST,
          totalSGST: bill.totals.totalSGST,
          totalTax: bill.totals.totalTax,
          grandTotal: bill.totals.grandTotal,
          payableAmount: bill.totals.payableAmount
        };
      } else if (orderType === 'prebooking') {
        // Calculate totals for pre-booking display
        const orderCalculation = calculateOrder({
          items: cart,
          employeeDiscount: 0
        });
        totals = {
          subtotal: orderCalculation.summary.subtotal,
          totalCGST: orderCalculation.summary.totalCGST,
          totalSGST: orderCalculation.summary.totalSGST,
          totalTax: orderCalculation.summary.totalTax,
          grandTotal: orderCalculation.summary.grandTotal,
          payableAmount: Math.round(orderCalculation.summary.grandTotal)
        };
      }
      
      const orderData = {
        type: finalOrderType,
        customerPhone: formData.customerPhone,
        customerName: formData.customerName,
        customerAddress: formData.customerAddress || '',
        items: cart.map(cartItem => ({
          productId: cartItem.productId,
          productName: cartItem.name,
          sku: cartItem.sku,
          category: cartItem.category,
          quantity: cartItem.quantity,
          unitPrice: cartItem.unitSalePrice || cartItem.unitBasePrice,
          lineTotal: (cartItem.unitSalePrice || cartItem.unitBasePrice) * cartItem.quantity
        })),
        totals: totals,
        status: orderType === 'prebooking' ? 'pending' : 'completed',
        exhibitionId,
        createdBy: user.uid,
        employeeName: userProfile?.name || user.email,
        deliveryDate: orderType === 'prebooking' ? formData.deliveryDate : null,
        billId: bill ? bill.billNumber : null
      };
      
      const createdOrder = await createOrder(orderData);
      
      // Show bill preview and save if generated
      if (bill) {
        // Update bill with actual order ID
        bill.orderId = createdOrder?.id || bill.orderId;
        
        // CRITICAL DEBUG: Log the bill object before saving
        console.log('=== BILL BEFORE SAVING ===');
        console.log('Bill customer data:', bill.customer);
        console.log('Full bill object:', bill);
        console.log('========================');
        
        // Save bill to Firestore
        try {
          const billId = await saveBill(bill);
          console.log('Bill saved to Firestore with ID:', billId);
          
          // Record payment immediately (STEP 6)
          if (paymentAmount && parseFloat(paymentAmount) > 0) {
            try {
              await recordPayment(billId, {
                mode: paymentMode,
                amount: parseFloat(paymentAmount),
                referenceId: null, // Not tracking reference IDs
                recordedBy: user.uid
              });
              
              console.log('Payment recorded successfully');
              
              // Update bill object with payment info for preview
              bill.id = billId;
              bill.paymentStatus = parseFloat(paymentAmount) >= bill.totals.payableAmount ? 'PAID' : 'PARTIALLY_PAID';
              bill.paidAmount = parseFloat(paymentAmount);
              bill.dueAmount = bill.totals.payableAmount - parseFloat(paymentAmount);
              bill.payments = [{
                mode: paymentMode,
                amount: parseFloat(paymentAmount),
                referenceId: paymentReferenceId.trim() || null,
                paidAt: new Date()
              }];
            } catch (paymentError) {
              console.error('Failed to record payment:', paymentError);
              // Don't fail the whole operation, just show warning
              setError('Order created but payment recording failed: ' + paymentError.message);
            }
          }
          
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
      
      // Reset payment fields (STEP 6)
      setPaymentMode('CASH');
      setPaymentAmount('');
      setPaymentReferenceId('');
      
    } catch (err) {
      // DON'T clear form on error - let user see what they entered
      setError('Failed to create order: ' + err.message);
      console.error('Order creation error:', err);
    }
  };

  const handlePhoneChange = async (e) => {
    const phone = e.target.value;
    
    // Only allow digits and limit to 10 characters
    const cleanedPhone = phone.replace(/\D/g, '').slice(0, 10);
    
    setFormData({...formData, customerPhone: cleanedPhone});
    
    // Auto-fill customer data when 10 digits are entered
    if (cleanedPhone.length === 10) {
      try {
        const customer = await getCustomerByPhone(cleanedPhone);
        if (customer) {
          setFormData({
            ...formData,
            customerPhone: cleanedPhone,
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
      
      // Pre-bookings should always convert to regular store sales (daily), not exhibition
      // Even if there's an active exhibition
      await convertPreBookingToSale(preBookingId, null);
      
      setSuccess('Pre-booking converted to sale successfully!');
      await loadData();
    } catch (err) {
      setError('Failed to convert pre-booking: ' + err.message);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigateToView(VIEWS.LOGIN);
    } catch (err) {
      setError('Failed to logout: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="emp-dashboard">
        <div className="emp-loading">
          <div className="loading-spinner-modern">
            <div className="spinner-ring"></div>
            <div className="spinner-ring"></div>
            <div className="spinner-ring"></div>
          </div>
          <p style={{ marginTop: '20px', color: '#64748b', fontSize: '14px' }}>Loading dashboard...</p>
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
            <button onClick={() => navigateToView(VIEWS.EMPLOYEE_ANALYTICS)} className="emp-nav-btn emp-nav-btn-primary">
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

        {/* Exhibition Selector Banner */}
        <div className="emp-exhibition-banner">
          <div className="emp-exhibition-content">
            <div className="emp-exhibition-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
              </svg>
            </div>
            <div className="emp-exhibition-info">
              <h3>Active Exhibitions</h3>
              <p>{activeExhibitions.length} exhibition{activeExhibitions.length !== 1 ? 's' : ''} available for sales</p>
            </div>
          </div>
        </div>

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
                  disabled={activeExhibitions.length === 0}
                >
                  <span className="emp-order-type-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                    </svg>
                  </span>
                  <span className="emp-order-type-label">Exhibition Sale</span>
                  {activeExhibitions.length === 0 && <span className="emp-order-type-badge">No Active Exhibitions</span>}
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
                        maxLength={10}
                        pattern="[0-9]{10}"
                        inputMode="numeric"
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
                        <label className="emp-label">Gender *</label>
                        <select
                          className="emp-select"
                          value={formData.customerGender}
                          onChange={(e) => setFormData({...formData, customerGender: e.target.value})}
                          required
                        >
                          <option value="">Select</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      <div className="emp-form-group">
                        <label className="emp-label">Age Group *</label>
                        <select
                          className="emp-select"
                          value={formData.customerAgeGroup}
                          onChange={(e) => setFormData({...formData, customerAgeGroup: e.target.value})}
                          required
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
                      <label className="emp-label">Search Product *</label>
                      {products.length === 0 ? (
                        <div className="emp-empty-state">
                          <p>No products available. Contact owner to add products.</p>
                        </div>
                      ) : (
                        <ProductSearchInput
                          products={products}
                          onSelect={handleProductSelect}
                          placeholder="Type to search products (e.g., shirt, kurti, jeans)..."
                        />
                      )}
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

                    {/* Exhibition Selector - Only for exhibition orders */}
                    {orderType === 'exhibition' && (
                      <div className="emp-form-group" style={{ marginTop: '16px' }}>
                        <label className="emp-label">Select Exhibition *</label>
                        <select
                          className="emp-select"
                          value={selectedExhibition}
                          onChange={(e) => setSelectedExhibition(e.target.value)}
                          required
                        >
                          <option value="">Choose an exhibition</option>
                          {activeExhibitions.map(ex => (
                            <option key={ex.id} value={ex.id}>
                              {ex.location} - Started {new Date(ex.startTime).toLocaleDateString('en-IN', { 
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </option>
                          ))}
                        </select>
                        {activeExhibitions.length === 0 && (
                          <span className="emp-helper" style={{ color: '#ef4444' }}>
                            No active exhibitions. Contact owner to create one.
                          </span>
                        )}
                      </div>
                    )}

                    {orderType === 'prebooking' && (
                      <div className="emp-form-group" style={{ marginTop: '16px' }}>
                        <label className="emp-label">Delivery Date & Time *</label>
                        <input
                          type="datetime-local"
                          className="emp-input"
                          value={formData.deliveryDate}
                          onChange={(e) => setFormData({...formData, deliveryDate: e.target.value})}
                          required
                          min={new Date().toISOString().slice(0, 16)}
                        />
                        <small style={{ display: 'block', marginTop: '4px', color: '#64748b', fontSize: '12px' }}>
                          Pre-booking will auto-convert to sale at delivery time
                        </small>
                      </div>
                    )}
                  </div>
                </div>

                {/* Payment Recording Section (STEP 6) - For all order types including pre-booking */}
                {cart.length > 0 && (() => {
                  try {
                    const orderCalc = calculateOrder({ items: cart, employeeDiscount: 0 });
                    const totalAmount = Math.round(orderCalc.summary.grandTotal);
                    
                    return (
                      <div style={{ marginTop: '20px', padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '2px solid #0f172a' }}>
                        <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>
                          💳 Payment Details {orderType === 'prebooking' && <span style={{ fontSize: '12px', fontWeight: '400', color: '#64748b' }}>(Advance Payment)</span>}
                        </h4>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', marginBottom: '4px', color: '#475569' }}>
                              Payment Mode *
                            </label>
                            <select
                              value={paymentMode}
                              onChange={(e) => setPaymentMode(e.target.value)}
                              style={{ width: '100%', padding: '8px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                            >
                              <option value="CASH">Cash</option>
                              <option value="UPI">UPI</option>
                              <option value="CARD">Card</option>
                              <option value="BANK_TRANSFER">Bank Transfer</option>
                            </select>
                          </div>
                          
                          <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', marginBottom: '4px', color: '#475569' }}>
                              Amount (₹) *
                            </label>
                            <input
                              type="text"
                              value={paymentAmount}
                              readOnly
                              placeholder={totalAmount.toString()}
                              style={{ 
                                width: '100%', 
                                padding: '8px', 
                                fontSize: '13px', 
                                border: '1px solid #cbd5e1', 
                                borderRadius: '4px',
                                backgroundColor: '#f1f5f9',
                                cursor: 'not-allowed',
                                color: '#475569'
                              }}
                            />
                            <small style={{ fontSize: '11px', color: '#64748b' }}>
                              Total: ₹{totalAmount} (Auto-calculated)
                            </small>
                          </div>
                        </div>
                        
                        <div style={{ padding: '8px', background: orderType === 'prebooking' ? '#fef3c7' : '#d1fae5', borderRadius: '4px', fontSize: '11px', color: orderType === 'prebooking' ? '#92400e' : '#065f46' }}>
                          {orderType === 'prebooking' 
                            ? '💰 Advance payment will be recorded for this pre-booking'
                            : 'ℹ️ Payment will be recorded when order is created'
                          }
                        </div>
                      </div>
                    );
                  } catch (err) {
                    return null;
                  }
                })()}

                <button 
                  type="submit" 
                  className="emp-btn emp-btn-primary emp-btn-lg emp-btn-block"
                  disabled={cart.length === 0 || (orderType === 'exhibition' && !selectedExhibition)}
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
                {preBookings.map(booking => {
                  // Check if delivery time has passed
                  const deliveryTime = new Date(booking.deliveryDate);
                  const now = new Date();
                  const isOverdue = deliveryTime <= now;
                  
                  return (
                    <div 
                      key={booking.id} 
                      className="emp-prebooking-card"
                      style={{
                        borderLeft: isOverdue ? '4px solid #ef4444' : '4px solid #f59e0b',
                        backgroundColor: isOverdue ? '#fef2f2' : 'white'
                      }}
                    >
                      <div className="emp-prebooking-header">
                        <span className="emp-prebooking-phone">{booking.customerPhone}</span>
                        <span className={`emp-badge ${isOverdue ? 'emp-badge-danger' : 'emp-badge-warning'}`}>
                          {isOverdue ? '🔴 Ready' : 'Pending'}
                        </span>
                      </div>
                      <div className="emp-prebooking-details">
                        <div className="emp-prebooking-row">
                          <span className="emp-prebooking-label">Product</span>
                          <span className="emp-prebooking-value">
                            {booking.items && booking.items.length > 0 
                              ? booking.items.map(item => `${item.productName} (${item.quantity})`).join(', ')
                              : 'N/A'}
                          </span>
                        </div>
                        <div className="emp-prebooking-row">
                          <span className="emp-prebooking-label">Amount</span>
                          <span className="emp-prebooking-value">
                            ₹{(() => {
                              // Try to get from totals first
                              if (booking.totals?.payableAmount) {
                                return booking.totals.payableAmount;
                              }
                              // Fallback: calculate from items for old pre-bookings
                              if (booking.items && booking.items.length > 0) {
                                const total = booking.items.reduce((sum, item) => {
                                  return sum + (item.lineTotal || (item.unitPrice * item.quantity));
                                }, 0);
                                return Math.round(total);
                              }
                              return 0;
                            })()}
                          </span>
                        </div>
                        <div className="emp-prebooking-row">
                          <span className="emp-prebooking-label">Delivery</span>
                          <span className="emp-prebooking-value" style={{ 
                            color: isOverdue ? '#dc2626' : 'inherit',
                            fontWeight: isOverdue ? '600' : 'normal'
                          }}>
                            {new Date(booking.deliveryDate).toLocaleString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                            {isOverdue && <span style={{ marginLeft: '6px' }}>⏰</span>}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleConvertPreBooking(booking.id)}
                        className="emp-btn emp-btn-success emp-btn-sm emp-btn-block"
                        style={{
                          background: isOverdue ? '#dc2626' : '#10b981',
                          animation: isOverdue ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none'
                        }}
                      >
                        {isOverdue ? '🔥 Convert Now' : 'Convert to Sale'}
                      </button>
                    </div>
                  );
                })}
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
          onPaymentRecorded={(updatedBill) => {
            // Update current bill with payment info
            setCurrentBill(updatedBill);
            // Refresh today's bills list
            loadData();
          }}
        />
      )}
    </div>
  );
};

export default EmployeeDashboard;
