import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getAllUsers, updateUser } from '../../services/authService';
import '../../styles/OwnerDashboard.css';

const UserManagement = () => {
  const { user, userProfile, logout } = useAuth();
  const navigate = useNavigate();
  
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const usersData = await getAllUsers();
      setUsers(usersData);
    } catch (err) {
      setError('Failed to load users: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
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
      await loadUsers();
    } catch (err) {
      setError('Failed to update role: ' + err.message);
    }
  };

  const handleToggleActive = async (userId, currentStatus) => {
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
      await loadUsers();
    } catch (err) {
      setError('Failed to update user status: ' + err.message);
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
    return <div className="dashboard-loading">Loading...</div>;
  }

  return (
    <div className="owner-dashboard">
      <div className="dashboard-header">
        <div className="header-content">
          <div>
            <h1>User Management</h1>
            <p>Welcome, {userProfile?.name || user?.email}</p>
          </div>
          <div className="header-actions">
            <button onClick={() => navigate('/owner/dashboard')} className="btn btn-secondary">
              ← Back to Dashboard
            </button>
            <button onClick={() => navigate('/owner/analytics')} className="btn btn-primary">
              View Analytics
            </button>
            <button onClick={handleLogout} className="btn btn-logout">
              Logout
            </button>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="dashboard-section">
        <h2>All Users</h2>
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
    </div>
  );
};

export default UserManagement;
