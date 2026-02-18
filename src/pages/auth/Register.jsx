import { useState } from 'react';
import { useView } from '../../contexts/ViewContext';
import '../../styles/Auth.css';

function Register() {
  const { navigateToView, VIEWS } = useView();

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
            Employee accounts are managed by your administrator
          </h1>

          <p className="auth-brand-description">
            For security and control, only business owners can create employee accounts.
          </p>

          <div className="auth-brand-features">
            <div className="auth-feature-item">
              <div className="auth-feature-icon">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <span>Centralized user management</span>
            </div>
            <div className="auth-feature-item">
              <div className="auth-feature-icon">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <span>Secure credential distribution</span>
            </div>
            <div className="auth-feature-item">
              <div className="auth-feature-icon">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <span>Role-based access control</span>
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
            <h2 className="auth-form-title">Self-registration is disabled</h2>
            <p className="auth-form-subtitle">
              Contact your business owner or administrator to create an account for you.
            </p>
          </div>

          <div className="auth-alert auth-alert-info">
            <strong>How to get access:</strong>
            <br />
            1. Contact your business owner or manager
            <br />
            2. They will create an account for you
            <br />
            3. You'll receive your login credentials
            <br />
            4. Use those credentials to sign in
          </div>

          <div className="auth-form-footer">
            <p className="auth-form-footer-text">
              Already have an account?{' '}
              <button 
                className="auth-form-link" 
                onClick={() => navigateToView(VIEWS.LOGIN)}
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
