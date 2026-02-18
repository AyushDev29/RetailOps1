import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useView } from '../../contexts/ViewContext';
import { getAllUsers, updateUser } from '../../services/authService';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import '../../styles/OwnerUsers.css';

const UserManagement = () => {
  const { user, logout } = useAuth();
  const { navigateToView, VIEWS } = useView();
  
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Create user form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'employee'
  });
  const [isCreating, setIsCreating] = useState(false);
  
  // Password visibility
  const [createdCredentials, setCreatedCredentials] = useState(null);

  useEffect(() => {
    loadUsers();
  }, []);

  // Reload users when auth state changes (after re-authentication)
  useEffect(() => {
    if (user && !loading) {
      loadUsers();
    }
  }, [user]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Check if user is authenticated before loading
      if (!auth.currentUser) {
        console.log('Waiting for authentication...');
        setLoading(false);
        return;
      }
      
      const usersData = await getAllUsers();
      setUsers(usersData);
    } catch (err) {
      // Don't show error if it's just a temporary auth issue
      if (err.message.includes('Missing or insufficient permissions')) {
        console.log('Waiting for re-authentication...');
      } else {
        setError('Failed to load users: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!createForm.name || !createForm.email || !createForm.password) {
      setError('Please fill in all fields');
      return;
    }

    if (createForm.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsCreating(true);

    try {
      // Store owner's credentials for re-authentication
      const ownerEmail = auth.currentUser.email;
      
      // Create new user account
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        createForm.email,
        createForm.password
      );
      
      const newUserId = userCredential.user.uid;
      
      // Create user profile in Firestore
      await setDoc(doc(db, 'users', newUserId), {
        email: createForm.email,
        name: createForm.name,
        role: createForm.role,
        createdAt: new Date().toISOString(),
        createdBy: user.uid,
        isActive: true
      });
      
      // Store credentials to show to owner
      setCreatedCredentials({
        email: createForm.email,
        password: createForm.password,
        name: createForm.name
      });
      
      setSuccess(`User account created successfully for ${createForm.name}`);
      setShowCreateForm(false);
      setCreateForm({
        name: '',
        email: '',
        password: '',
        role: 'employee'
      });
      
      // Sign out the newly created user
      await auth.signOut();
      
      // The AuthContext will automatically re-authenticate the owner
      // Wait a bit for re-authentication to complete before reloading users
      setTimeout(async () => {
        try {
          await loadUsers();
        } catch (err) {
          console.log('Will retry loading users after re-authentication');
        }
      }, 2000);
      
    } catch (err) {
      console.error('Error creating user:', err);
      if (err.code === 'auth/email-already-in-use') {
        setError('Email address is already in use');
      } else if (err.code === 'auth/invalid-email') {
        setError('Invalid email address');
      } else if (err.code === 'auth/weak-password') {
        setError('Password is too weak');
      } else {
        setError('Failed to create user: ' + err.message);
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleActive = async (userId, currentStatus) => {
    if (userId === user.uid) {
      setError('You cannot disable your own account');
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
      setError('Failed to update user: ' + err.message);
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
      <div className="owner-users">
        <div className="owner-users-loading">Loading users...</div>
      </div>
    );
  }

  return (
    <div className="owner-users">
      {/* Header */}
      <nav className="owner-users-nav">
        <div className="owner-users-nav-content">
          <div className="owner-users-nav-left">
            <div className="owner-users-brand">
              <div className="owner-users-brand-mark">R</div>
              <span className="owner-users-brand-name">RetailOps</span>
            </div>
            <h1 className="owner-users-nav-title">User Management</h1>
          </div>
          <div className="owner-users-nav-right">
            <button onClick={() => navigateToView(VIEWS.OWNER_DASHBOARD)} className="btn-secondary">
              ← Back to Dashboard
            </button>
            <button onClick={handleLogout} className="btn-secondary">
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="owner-users-content">
        {/* Messages */}
        {error && (
          <div className="alert alert-error">
            {error}
          </div>
        )}
        {success && (
          <div className="alert alert-success">
            {success}
          </div>
        )}

        {/* Created Credentials Display */}
        {createdCredentials && (
          <div className="credentials-display">
            <div className="credentials-header">
              <h3>✓ Account Created Successfully</h3>
              <button onClick={() => setCreatedCredentials(null)} className="btn-close">×</button>
            </div>
            <p className="credentials-instruction">
              Please save these credentials and provide them to the employee. They will not be shown again.
            </p>
            <div className="credentials-box">
              <div className="credential-item">
                <label>Name:</label>
                <span>{createdCredentials.name}</span>
              </div>
              <div className="credential-item">
                <label>Email:</label>
                <span>{createdCredentials.email}</span>
              </div>
              <div className="credential-item">
                <label>Password:</label>
                <span className="credential-password">{createdCredentials.password}</span>
              </div>
            </div>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(
                  `Name: ${createdCredentials.name}\nEmail: ${createdCredentials.email}\nPassword: ${createdCredentials.password}`
                );
                setSuccess('Credentials copied to clipboard!');
              }}
              className="btn-copy"
            >
              📋 Copy Credentials
            </button>
          </div>
        )}

        {/* Create User Section */}
        <div className="owner-users-section">
          <div className="section-header">
            <h2>Create New User</h2>
            <button 
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="btn-primary"
            >
              {showCreateForm ? 'Cancel' : '+ Create User'}
            </button>
          </div>

          {showCreateForm && (
            <div className="create-user-form-container">
              <form onSubmit={handleCreateUser} className="create-user-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>Full Name *</label>
                    <input
                      type="text"
                      value={createForm.name}
                      onChange={(e) => setCreateForm({...createForm, name: e.target.value})}
                      placeholder="John Doe"
                      disabled={isCreating}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Email Address *</label>
                    <input
                      type="email"
                      value={createForm.email}
                      onChange={(e) => setCreateForm({...createForm, email: e.target.value})}
                      placeholder="john@company.com"
                      disabled={isCreating}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Password *</label>
                    <input
                      type="text"
                      value={createForm.password}
                      onChange={(e) => setCreateForm({...createForm, password: e.target.value})}
                      placeholder="Minimum 6 characters"
                      disabled={isCreating}
                      required
                      minLength={6}
                    />
                    <span className="form-helper">Password will be visible to you after creation</span>
                  </div>
                  <div className="form-group">
                    <label>Role *</label>
                    <select
                      value={createForm.role}
                      onChange={(e) => setCreateForm({...createForm, role: e.target.value})}
                      disabled={isCreating}
                    >
                      <option value="employee">Employee</option>
                      <option value="owner">Owner</option>
                    </select>
                  </div>
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn-primary" disabled={isCreating}>
                    {isCreating ? 'Creating...' : 'Create User Account'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Users List */}
        <div className="owner-users-section">
          <h2>All Users ({users.length})</h2>
          
          <div className="users-table-container">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className={!u.isActive ? 'user-disabled' : ''}>
                    <td>
                      <div className="user-name">
                        {u.name || 'N/A'}
                        {u.id === user.uid && <span className="badge-you">You</span>}
                      </div>
                    </td>
                    <td>{u.email}</td>
                    <td>
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        className="role-select"
                        disabled={u.id === user.uid}
                      >
                        <option value="employee">Employee</option>
                        <option value="owner">Owner</option>
                      </select>
                    </td>
                    <td>
                      <span className={`badge ${u.isActive ? 'badge-active' : 'badge-inactive'}`}>
                        {u.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td>
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}
                    </td>
                    <td>
                      <button
                        onClick={() => handleToggleActive(u.id, u.isActive)}
                        className={`btn-action ${u.isActive ? 'btn-disable' : 'btn-enable'}`}
                        disabled={u.id === user.uid}
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
    </div>
  );
};

export default UserManagement;
