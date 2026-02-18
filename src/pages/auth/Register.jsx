import { useState } from 'react';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import { useView } from '../../contexts/ViewContext';
import '../../styles/Auth.css';

function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { navigateToView, VIEWS } = useView();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );

      const user = userCredential.user;

      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: formData.email,
        name: formData.name,
        role: 'employee',
        isActive: true,
        createdAt: serverTimestamp()
      });

      await signOut(auth);
      setSuccess(true);

      setTimeout(() => {
        navigateToView(VIEWS.LOGIN);
      }, 2500);

    } catch (err) {
      console.error('Registration failed:', err);

      if (err.code === 'auth/email-already-in-use') {
        setError('Email already registered. Please sign in instead.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Invalid email address');
      } else if (err.code === 'auth/weak-password') {
        setError('Password is too weak');
      } else {
        setError('Registration failed. Please try again');
      }
      setIsLoading(false);
    }
  };

  if (success) {
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
              Welcome to the team
            </h1>

            <p className="auth-brand-description">
              Your account has been created successfully. You can now sign in and start managing operations.
            </p>
          </div>

          <div className="auth-brand-footer">
            © 2024 RetailOps. Internal use only.
          </div>
        </div>

        {/* Form Panel */}
        <div className="auth-form-panel">
          <div className="auth-form-container">
            <div className="auth-success-state">
              <div className="auth-success-icon">✓</div>
              <h2 className="auth-success-title">Account created successfully</h2>
              <p className="auth-success-text">
                Redirecting you to sign in...
              </p>
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
            Join your team and start managing sales
          </h1>

          <p className="auth-brand-description">
            Create your account to access the retail management platform.
          </p>

          <div className="auth-brand-features">
            <div className="auth-feature-item">
              <div className="auth-feature-icon">✓</div>
              <span>Instant access to dashboard</span>
            </div>
            <div className="auth-feature-item">
              <div className="auth-feature-icon">✓</div>
              <span>Secure employee account</span>
            </div>
            <div className="auth-feature-item">
              <div className="auth-feature-icon">✓</div>
              <span>Role-based permissions</span>
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
            <h2 className="auth-form-title">Create your account</h2>
            <p className="auth-form-subtitle">
              Fill in your details to get started
            </p>
          </div>

          {error && (
            <div className="auth-alert auth-alert-error">
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="auth-form">
            <div className="auth-form-group">
              <label htmlFor="name" className="auth-form-label">
                Full name
              </label>
              <input
                id="name"
                type="text"
                name="name"
                className="auth-form-input"
                value={formData.name}
                onChange={handleChange}
                placeholder="John Doe"
                disabled={isLoading}
                required
                autoComplete="name"
              />
            </div>

            <div className="auth-form-group">
              <label htmlFor="email" className="auth-form-label">
                Email address
              </label>
              <input
                id="email"
                type="email"
                name="email"
                className="auth-form-input"
                value={formData.email}
                onChange={handleChange}
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
                name="password"
                className="auth-form-input"
                value={formData.password}
                onChange={handleChange}
                placeholder="Minimum 6 characters"
                disabled={isLoading}
                required
                autoComplete="new-password"
              />
              <span className="auth-form-helper">
                Must be at least 6 characters long
              </span>
            </div>

            <div className="auth-form-group">
              <label htmlFor="confirmPassword" className="auth-form-label">
                Confirm password
              </label>
              <input
                id="confirmPassword"
                type="password"
                name="confirmPassword"
                className="auth-form-input"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Re-enter your password"
                disabled={isLoading}
                required
                autoComplete="new-password"
              />
            </div>

            <div className="auth-form-actions">
              <button 
                type="submit" 
                className="auth-submit-btn"
                disabled={isLoading}
              >
                {isLoading ? 'Creating account...' : 'Create account'}
              </button>
            </div>
          </form>

          <div className="auth-form-footer">
            <p className="auth-form-footer-text">
              Already have an account?{' '}
              <button 
                className="auth-form-link" 
                onClick={() => navigateToView(VIEWS.LOGIN)}
                disabled={isLoading}
              >
                Sign in
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;
