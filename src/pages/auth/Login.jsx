import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import InputField from '../../components/common/InputField';
import Button from '../../components/common/Button';
import '../../styles/Login.css';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showLogoutPrompt, setShowLogoutPrompt] = useState(false);
  
  const { login, logout, user, userProfile, loading } = useAuth();
  const navigate = useNavigate();

  // Check if user is already logged in
  useEffect(() => {
    if (!loading && user && userProfile) {
      // User is already logged in - show prompt to logout or go to dashboard
      setShowLogoutPrompt(true);
    }
  }, [user, userProfile, loading]);

  const handleLogout = async () => {
    try {
      await logout();
      setShowLogoutPrompt(false);
      setError('');
    } catch (err) {
      console.error('Logout failed:', err);
      setError('Logout failed. Please try again.');
    }
  };

  const goToDashboard = () => {
    if (userProfile?.role === 'owner') {
      navigate('/owner', { replace: true });
    } else {
      navigate('/employee', { replace: true });
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    setIsLoading(true);

    try {
      await login(email, password);
      // After successful login, redirect will happen automatically
    } catch (err) {
      console.error('Login failed:', err);
      
      if (err.code === 'auth/user-not-found') {
        setError('No account found with this email');
      } else if (err.code === 'auth/wrong-password') {
        setError('Incorrect password');
      } else if (err.code === 'auth/invalid-email') {
        setError('Invalid email address');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Please try again later');
      } else if (err.code === 'auth/invalid-credential') {
        setError('Invalid email or password');
      } else {
        setError('Login failed. Please try again');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading during initial auth check
  if (loading) {
    return (
      <div className="login-page">
        <div className="login-container">
          <div className="loading">Checking authentication...</div>
        </div>
      </div>
    );
  }

  // If user is already logged in, show logout prompt
  if (showLogoutPrompt && user && userProfile) {
    return (
      <div className="login-page">
        <div className="login-container">
          <div className="login-header">
            <div className="logo">👤</div>
            <h1>Already Logged In</h1>
            <h2>You are logged in as {userProfile.name}</h2>
          </div>

          <div className="success-message">
            <p>You are currently logged in.</p>
            <p>Role: <strong>{userProfile.role}</strong></p>
          </div>

          <div className="login-form">
            <Button 
              onClick={goToDashboard}
              variant="primary"
            >
              Go to Dashboard
            </Button>

            <Button 
              onClick={handleLogout}
              variant="secondary"
            >
              Logout
            </Button>
          </div>

          {error && (
            <div className="error-message" style={{ marginTop: '16px' }}>
              {error}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Show login form
  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <div className="logo">👔</div>
          <h1>Clothing Brand Management</h1>
          <h2>Welcome Back</h2>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <InputField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            disabled={isLoading}
            required
          />

          <InputField
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            disabled={isLoading}
            required
          />

          <Button 
            type="submit" 
            disabled={isLoading}
            variant="primary"
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </Button>
        </form>

        <div className="login-footer">
          <p>
            Don't have an account?{' '}
            <button 
              className="link-button" 
              onClick={() => navigate('/register')}
              disabled={isLoading}
            >
              Register here
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
