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
  
  // State management
  const [products, setProducts] = useState([]);
  const [activeExhibition, setActiveExhibition] = useState(null);
  const [preBookings, setPreBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Form state
  const [orderType, setOrderType] = useState('store'); // 'store' | 'exhibition' | 'prebooking'
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
  
  // Exhibition form state
  const [exhibitionForm, setExhibitionForm] = useState({
    location: '',
    startTime: ''
  });

  // Load initial data
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

  // Handle seed products
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

  // Handle start exhibition
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
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  // Handle end exhibition
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

  // Handle order form submission
  const handleCreateOrder = async (e) => {
    e.preventDefault();
    
    try {
      setError('');
      setSuccess('');
      
      // Validation
      if (!formData.customerPhone || !formData.customerName || !formData.productId || !formData.price) {
        setError('Please fill in all required fields');
        return;
      }
      
      if (orderType === 'prebooking' && !formData.deliveryDate) {
        setError('Delivery date is required for pre-bookings');
        return;
      }
      
      // Exhibition Sale requires active exhibition
      if (orderType === 'exhibition' && !activeExhibition) {
        setError('Start an exhibition to create exhibition sales');
        return;
      }
      
      // Step 1: Create or update customer
      await createOrUpdateCustomer({
        phone: formData.customerPhone,
        name: formData.customerName,
        address: formData.customerAddress,
        gender: formData.customerGender,
        ageGroup: formData.customerAgeGroup
      });
      
      // Step 2: Determine order type and exhibition linkage
      let finalOrderType = orderType;
      let exhibitionId = null;
      
      // Map UI order types to backend types
      if (orderType === 'store') {
        finalOrderType = 'daily';
        exhibitionId = null; // Store sales never have exhibition
      } else if (orderType === 'exhibition') {
        finalOrderType = 'exhibition';
        exhibitionId = activeExhibition.id; // Exhibition sales must have exhibition
      } else if (orderType === 'prebooking') {
        finalOrderType = 'prebooking';
        exhibitionId = null; // Pre-bookings never have exhibition
      }
      
      // Step 3: Create order
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
      
      // Reset form
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
      
      // Reload data
      await loadData();
    } catch (err) {
      setError('Failed to create order: ' + err.message);
    }
  };

  // Handle phone number change and auto-fill customer data
  const handlePhoneChange = async (e) => {
    const phone = e.target.value;
    setFormData({...formData, customerPhone: phone});
    
    // Auto-fill if phone number is complete (10 digits)
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

  // Handle convert pre-booking to sale
  const handleConvertPreBooking = async (preBookingId) => {
    try {
      setError('');
      setSuccess('');
      
      // Auto-link to active exhibition if exists
      const exhibitionId = activeExhibition ? activeExhibition.id : null;
      
      await convertPreBookingToSale(preBookingId, exhibitionId);
      
      setSuccess('Pre-booking converted to sale successfully!');
      await loadData();
    } catch (err) {
      setError('Failed to convert pre-booking: ' + err.message);
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

  if (loading) {
    return <div className="dashboard-loading">Loading...</div>;
  }

  return (
    <div className="employee-dashboard">
      <div className="dashboard-header">
        <div className="header-content">
          <div>
            <h1>Employee Dashboard</h1>
            <p>Welcome, {userProfile?.name || user?.email}</p>
          </div>
          <div className="header-actions">
            <button onClick={() => navigate('/employee/analytics')} className="btn btn-primary">
              View Analytics
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

      {/* Exhibition Management */}
      <div className="dashboard-section">
        <h2>Exhibition Management</h2>
        
        {activeExhibition ? (
          <div className="active-exhibition">
            <div className="exhibition-info">
              <p><strong>Location:</strong> {activeExhibition.location}</p>
              <p><strong>Started:</strong> {activeExhibition.startTime}</p>
              <p className="status-active">● Active</p>
            </div>
            <button 
              onClick={handleEndExhibition}
              className="btn btn-danger"
            >
              End Exhibition
            </button>
          </div>
        ) : (
          <form onSubmit={handleStartExhibition} className="exhibition-form">
            <div className="form-group">
              <label>Location</label>
              <input
                type="text"
                value={exhibitionForm.location}
                onChange={(e) => setExhibitionForm({...exhibitionForm, location: e.target.value})}
                placeholder="Enter exhibition location"
                required
              />
            </div>
            <div className="form-group">
              <label>Start Time</label>
              <input
                type="datetime-local"
                value={exhibitionForm.startTime}
                onChange={(e) => setExhibitionForm({...exhibitionForm, startTime: e.target.value})}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary">
              Start Exhibition
            </button>
          </form>
        )}
      </div>

      {/* Order Creation Form */}
      <div className="dashboard-section">
        <h2>Create Order</h2>
        
        <div className="order-type-toggle">
          <button
            className={`toggle-btn ${orderType === 'store' ? 'active' : ''}`}
            onClick={() => setOrderType('store')}
          >
            Store Sale
          </button>
          <button
            className={`toggle-btn ${orderType === 'exhibition' ? 'active' : ''}`}
            onClick={() => setOrderType('exhibition')}
          >
            Exhibition Sale
          </button>
          <button
            className={`toggle-btn ${orderType === 'prebooking' ? 'active' : ''}`}
            onClick={() => setOrderType('prebooking')}
          >
            Pre-Booking
          </button>
        </div>

        {orderType === 'exhibition' && !activeExhibition && (
          <div className="warning-message">
            ⚠️ Start an exhibition to create exhibition sales
          </div>
        )}

        <form onSubmit={handleCreateOrder} className="order-form">
          <div className="form-group">
            <label>Customer Phone *</label>
            <input
              type="tel"
              value={formData.customerPhone}
              onChange={handlePhoneChange}
              placeholder="Enter customer phone"
              required
            />
          </div>

          <div className="form-group">
            <label>Customer Name *</label>
            <input
              type="text"
              value={formData.customerName}
              onChange={(e) => setFormData({...formData, customerName: e.target.value})}
              placeholder="Enter customer name"
              required
            />
          </div>

          <div className="form-group">
            <label>Customer Address</label>
            <input
              type="text"
              value={formData.customerAddress}
              onChange={(e) => setFormData({...formData, customerAddress: e.target.value})}
              placeholder="Enter customer address (optional)"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Gender</label>
              <select
                value={formData.customerGender}
                onChange={(e) => setFormData({...formData, customerGender: e.target.value})}
              >
                <option value="">Select gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label>Age Group</label>
              <select
                value={formData.customerAgeGroup}
                onChange={(e) => setFormData({...formData, customerAgeGroup: e.target.value})}
              >
                <option value="">Select age group</option>
                <option value="0-12">0-12 (Kids)</option>
                <option value="13-19">13-19 (Teens)</option>
                <option value="20-35">20-35 (Young Adults)</option>
                <option value="36-50">36-50 (Adults)</option>
                <option value="51+">51+ (Seniors)</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Product *</label>
            {products.length === 0 ? (
              <div className="no-products">
                <p>No products available</p>
                <button 
                  type="button"
                  onClick={handleSeedProducts}
                  className="btn btn-secondary"
                >
                  Add Sample Products
                </button>
              </div>
            ) : (
              <select
                value={formData.productId}
                onChange={(e) => setFormData({...formData, productId: e.target.value})}
                required
              >
                <option value="">Select a product</option>
                {products.map(product => (
                  <option key={product.id} value={product.id}>
                    {product.name} ({product.category})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Price *</label>
              <input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({...formData, price: e.target.value})}
                placeholder="Enter price"
                min="0"
                step="0.01"
                required
              />
            </div>

            <div className="form-group">
              <label>Quantity *</label>
              <input
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                min="1"
                required
              />
            </div>
          </div>

          {orderType === 'prebooking' && (
            <div className="form-group">
              <label>Delivery Date *</label>
              <input
                type="date"
                value={formData.deliveryDate}
                onChange={(e) => setFormData({...formData, deliveryDate: e.target.value})}
                required
              />
            </div>
          )}

          <button type="submit" className="btn btn-primary" disabled={products.length === 0 || (orderType === 'exhibition' && !activeExhibition)}>
            {orderType === 'prebooking' ? 'Create Pre-Booking' : 
             orderType === 'exhibition' ? 'Create Exhibition Sale' : 
             'Create Store Sale'}
          </button>
        </form>
      </div>

      {/* Pre-Bookings List */}
      {preBookings.length > 0 && (
        <div className="dashboard-section">
          <h2>Pending Pre-Bookings</h2>
          <div className="prebookings-list">
            {preBookings.map(booking => (
              <div key={booking.id} className="prebooking-card">
                <div className="prebooking-info">
                  <p><strong>Phone:</strong> {booking.customerPhone}</p>
                  <p><strong>Product ID:</strong> {booking.productId}</p>
                  <p><strong>Price:</strong> ₹{booking.price}</p>
                  <p><strong>Delivery:</strong> {booking.deliveryDate}</p>
                </div>
                <button
                  onClick={() => handleConvertPreBooking(booking.id)}
                  className="btn btn-success"
                >
                  Convert to Sale
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeDashboard;
