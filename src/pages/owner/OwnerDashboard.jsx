import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getAllUsers, updateUser } from '../../services/authService';
import { getAllProducts, createProduct, updateProduct } from '../../services/productService';
import { getAllExhibitions } from '../../services/exhibitionService';
import { getAllOrders } from '../../services/orderService';
import '../../styles/OwnerDashboard.css';

const OwnerDashboard = () => {
  const { user, userProfile, logout } = useAuth();
  const navigate = useNavigate();
  
  // State management
  const [activeTab, setActiveTab] = useState('users'); // 'users' | 'products' | 'exhibitions' | 'orders'
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [exhibitions, setExhibitions] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Product form state
  const [productForm, setProductForm] = useState({
    name: '',
    category: ''
  });
  
  // Filters
  const [orderTypeFilter, setOrderTypeFilter] = useState('all');
  const [employeeFilter, setEmployeeFilter] = useState('all');
  
  // Lookup maps for resolving IDs to names
  const [userMap, setUserMap] = useState({});
  const [productMap, setProductMap] = useState({});

  // Load data based on active tab
  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      
      if (activeTab === 'users') {
        const usersData = await getAllUsers();
        setUsers(usersData);
        // Build user map for lookups
        const map = {};
        usersData.forEach(u => {
          map[u.id] = u.name || u.email;
        });
        setUserMap(map);
      } else if (activeTab === 'products') {
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
      
      if (!productForm.name || !productForm.category) {
        setError('Please fill in all fields');
        return;
      }
      
      await createProduct({
        name: productForm.name,
        category: productForm.category
      });
      
      setSuccess('Product created successfully');
      setProductForm({ name: '', category: '' });
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
      
      await updateProduct(productId, { active: !currentStatus });
      setSuccess(`Product ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
      await loadData();
    } catch (err) {
      setError('Failed to update product: ' + err.message);
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

  // Filter orders
  const filteredOrders = orders.filter(order => {
    if (orderTypeFilter !== 'all' && order.type !== orderTypeFilter) return false;
    if (employeeFilter !== 'all' && order.createdBy !== employeeFilter) return false;
    return true;
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
          <button onClick={handleLogout} className="btn btn-logout">
            Logout
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button
          className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          User Management
        </button>
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

      {/* User Management Tab */}
      {activeTab === 'users' && (
        <div className="dashboard-section">
          <h2>User Management</h2>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Created At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td>
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        disabled={u.id === user.uid}
                        className="role-select"
                      >
                        <option value="employee">Employee</option>
                        <option value="owner">Owner</option>
                      </select>
                    </td>
                    <td>
                      <span className={`status-badge ${u.isActive ? 'active' : 'inactive'}`}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}</td>
                    <td>
                      <button
                        onClick={() => handleToggleActive(u.id, u.isActive)}
                        disabled={u.id === user.uid && u.isActive}
                        className={`btn btn-sm ${u.isActive ? 'btn-danger' : 'btn-success'}`}
                      >
                        {u.isActive ? 'Disable' : 'Enable'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Product Management Tab */}
      {activeTab === 'products' && (
        <div className="dashboard-section">
          <h2>Product Management</h2>
          
          <form onSubmit={handleCreateProduct} className="product-form">
            <h3>Create New Product</h3>
            <div className="form-row">
              <input
                type="text"
                placeholder="Product Name"
                value={productForm.name}
                onChange={(e) => setProductForm({...productForm, name: e.target.value})}
                required
              />
              <input
                type="text"
                placeholder="Category"
                value={productForm.category}
                onChange={(e) => setProductForm({...productForm, category: e.target.value})}
                required
              />
              <button type="submit" className="btn btn-primary">
                Create Product
              </button>
            </div>
          </form>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Created At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map(p => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td>{p.category}</td>
                    <td>
                      <span className={`status-badge ${p.active ? 'active' : 'inactive'}`}>
                        {p.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>{p.createdAt?.toDate ? p.createdAt.toDate().toLocaleDateString() : 'N/A'}</td>
                    <td>
                      <button
                        onClick={() => handleToggleProductActive(p.id, p.active)}
                        className={`btn btn-sm ${p.active ? 'btn-danger' : 'btn-success'}`}
                      >
                        {p.active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
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
                      <td>{ex.endTime ? new Date(ex.endTime.seconds * 1000).toLocaleString() : 'Ongoing'}</td>
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

          {filteredOrders.length === 0 ? (
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
                    <th>Product</th>
                    <th>Quantity</th>
                    <th>Price</th>
                    <th>Status</th>
                    <th>Created By</th>
                    <th>Created At</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map(order => (
                    <tr key={order.id}>
                      <td>
                        <span className="type-badge">
                          {order.type === 'daily' ? 'Store' : order.type === 'exhibition' ? 'Exhibition' : 'Pre-Booking'}
                        </span>
                      </td>
                      <td>{order.customerPhone}</td>
                      <td>{productMap[order.productId] || order.productId}</td>
                      <td>{order.quantity}</td>
                      <td>₹{order.price}</td>
                      <td>
                        <span className={`status-badge ${order.status === 'completed' ? 'active' : 'inactive'}`}>
                          {order.status}
                        </span>
                      </td>
                      <td>{userMap[order.createdBy] || order.createdBy}</td>
                      <td>{order.createdAt?.toDate ? order.createdAt.toDate().toLocaleDateString() : 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default OwnerDashboard;
