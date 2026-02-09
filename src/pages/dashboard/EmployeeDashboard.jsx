import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getActiveProducts } from '../../services/productService';
import { getActiveExhibition, startExhibition, endExhibition } from '../../services/exhibitionService';
import { createOrder, getPendingPreBookings, convertPreBookingToSale } from '../../services/orderService';
import { getCustomerByPhone, createOrUpdateCustomer } from '../../services/customerService';
import { seedProducts } from '../../utils/seedProducts';
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
  
  const [orderType, setOrderType] = useState('store');
  const [formData, setFormData] = useState({
    customerPhone: '',
    customerName: '',
    customerAddress: '',
    customerGender: '',
    customerAgeGroup: '',
    productId: '',
    price: '',
    quantity: 1,
    deliveryDate: ''
  });
  
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
    } catch (err) {
      setError('Failed to load data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSeedProducts = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      
      await seedProducts();
      await loadData();
      
      setSuccess('Sample products added successfully!');
    } catch (err) {
      setError('Failed to seed products: ' + err.message);
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

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    
    try {
      setError('');
      setSuccess('');
      
      if (!formData.customerPhone || !formData.customerName || !formData.productId || !formData.price) {
        setError('Please fill in all required fields');
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
      
      const orderData = {
        type: finalOrderType,
        customerPhone: formData.customerPhone,
        productId: formData.productId,
        price: parseFloat(formData.price),
        quantity: parseInt(formData.quantity),
        status: orderType === 'prebooking' ? 'pending' : 'completed',
        exhibitionId,
        createdBy: user.uid,
        deliveryDate: orderType === 'prebooking' ? formData.deliveryDate : null
      };
      
      await createOrder(orderData);
      
      const orderTypeLabel = orderType === 'store' ? 'Store Sale' : 
                            orderType === 'exhibition' ? 'Exhibition Sale' : 
                            'Pre-booking';
      setSuccess(`${orderTypeLabel} created successfully!`);
      
      setFormData({
        customerPhone: '',
        customerName: '',
        customerAddress: '',
        customerGender: '',
        customerAgeGroup: '',
        productId: '',
        price: '',
        quantity: 1,
        deliveryDate: ''
      });
      
      await loadData();
    } catch (err) {
      setError('Failed to create order: ' + err.message);
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
                  <p>{activeExhibition.location} • Started {new Date(activeExhibition.startTime).toLocaleString()}</p>
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
                    <h4 className="emp-form-section-title">Product Details</h4>
                    
                    <div className="emp-form-group">
                      <label className="emp-label">Product *</label>
                      {products.length === 0 ? (
                        <div className="emp-empty-state">
                          <p>No products available</p>
                          <button 
                            type="button"
                            onClick={handleSeedProducts}
                            className="emp-btn emp-btn-secondary emp-btn-sm"
                          >
                            Add Sample Products
                          </button>
                        </div>
                      ) : (
                        <select
                          className="emp-select"
                          value={formData.productId}
                          onChange={(e) => setFormData({...formData, productId: e.target.value})}
                          required
                        >
                          <option value="">Select product</option>
                          {products.map(product => (
                            <option key={product.id} value={product.id}>
                              {product.name} ({product.category})
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    <div className="emp-form-row">
                      <div className="emp-form-group">
                        <label className="emp-label">Price *</label>
                        <input
                          type="number"
                          className="emp-input"
                          value={formData.price}
                          onChange={(e) => setFormData({...formData, price: e.target.value})}
                          placeholder="₹"
                          min="0"
                          step="0.01"
                          required
                        />
                      </div>

                      <div className="emp-form-group">
                        <label className="emp-label">Quantity *</label>
                        <input
                          type="number"
                          className="emp-input"
                          value={formData.quantity}
                          onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                          min="1"
                          required
                        />
                      </div>
                    </div>

                    {orderType === 'prebooking' && (
                      <div className="emp-form-group">
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
                  disabled={products.length === 0 || (orderType === 'exhibition' && !activeExhibition)}
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
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboard;
