import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useView } from '../../contexts/ViewContext';
import '../../styles/Auth.css';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showLogoutPrompt, setShowLogoutPrompt] = useState(false);
  
  const { login, logout, user, userProfile, loading } = useAuth();
  const { navigateToDefault, VIEWS, navigateToView } = useView();

  useEffect(() => {
    if (!loading && user && userProfile) {
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
    navigateToDefault();
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
      // Navigation will happen automatically via ViewContext
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

  if (loading) {
    return (
      <div className="auth-layout">
        <div className="auth-form-panel" style={{ width: '100%' }}>
          <div className="auth-loading">Checking authentication...</div>
        </div>
      </div>
    );
  }

  if (showLogoutPrompt && user && userProfile) {
    return (
      <div className="auth-layout">
        {/* Brand Panel */}
        <div className="auth-brand-panel">
          <div className="auth-brand-content">
            <div className="auth-brand-logo">
              <div className="auth-brand-mark">R</div>
              <div className="auth-brand-name">RetailOps</div>
            </div>

            <h1 className="auth-brand-headline">
              Manage your retail operations with confidence
            </h1>

            <p className="auth-brand-description">
              Track sales, manage exhibitions, and analyze performance — all in one place.
            </p>
          </div>

          <div className="auth-brand-footer">
            © 2024 RetailOps. Internal use only.
          </div>
        </div>

        {/* Form Panel */}
        <div className="auth-form-panel">
          <div className="auth-form-container">
            <div className="auth-logged-in-state">
              <div className="auth-logged-in-icon">✓</div>
              <h2 className="auth-logged-in-title">You're already signed in</h2>
              <p className="auth-logged-in-text">
                Signed in as <strong>{userProfile.name}</strong> ({userProfile.role})
              </p>

              {error && (
                <div className="auth-alert auth-alert-error">
                  {error}
                </div>
              )}

              <div className="auth-logged-in-actions">
                <button onClick={goToDashboard} className="auth-submit-btn">
                  Go to Dashboard
                </button>
                <button onClick={handleLogout} className="auth-secondary-btn">
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-layout">
      {/* Brand Panel */}
      <div className="auth-brand-panel">
        <div className="auth-brand-content">
          <div className="auth-brand-logo">
            <div className="auth-brand-mark">R</div>
            <div className="auth-brand-name">RetailOps</div>
          </div>

          <h1 className="auth-brand-headline">
            Manage your retail operations with confidence
          </h1>

          <p className="auth-brand-description">
            Track sales, manage exhibitions, and analyze performance — all in one place.
          </p>

          <div className="auth-brand-features">
            <div className="auth-feature-item">
              <div className="auth-feature-icon">✓</div>
              <span>Real-time sales tracking</span>
            </div>
            <div className="auth-feature-item">
              <div className="auth-feature-icon">✓</div>
              <span>Exhibition management</span>
            </div>
            <div className="auth-feature-item">
              <div className="auth-feature-icon">✓</div>
              <span>Analytics & insights</span>
            </div>
          </div>
        </div>

        <div className="auth-brand-footer">
          © 2024 RetailOps. Internal use only.
        </div>
      </div>

      {/* Form Panel */}
      <div className="auth-form-panel">
        <div className="auth-form-container">
          <div className="auth-form-header">
            <h2 className="auth-form-title">Sign in to your account</h2>
            <p className="auth-form-subtitle">
              Enter your credentials to access the dashboard
            </p>
          </div>

          {error && (
            <div className="auth-alert auth-alert-error">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="auth-form">
            <div className="auth-form-group">
              <label htmlFor="email" className="auth-form-label">
                Email address
              </label>
              <input
                id="email"
                type="email"
                className="auth-form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                disabled={isLoading}
                required
                autoComplete="email"
              />
            </div>

            <div className="auth-form-group">
              <label htmlFor="password" className="auth-form-label">
                Password
              </label>
              <input
                id="password"
                type="password"
                className="auth-form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                disabled={isLoading}
                required
                autoComplete="current-password"
              />
            </div>

            <div className="auth-form-actions">
              <button 
                type="submit" 
                className="auth-submit-btn"
                disabled={isLoading}
              >
                {isLoading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>
          </form>

          <div className="auth-form-footer">
            <p className="auth-form-footer-text">
              Don't have an account?{' '}
              <button 
                className="auth-form-link" 
                onClick={() => navigateToView(VIEWS.REGISTER)}
                disabled={isLoading}
              >
                Create account
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
