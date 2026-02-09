import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import Button from '../common/Button';

function Navbar() {
  const { userProfile, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-content">
        <h1>Clothing Brand Management</h1>
        <div className="navbar-right">
          {userProfile && (
            <>
              <span className="user-info">
                {userProfile.name} ({userProfile.role})
              </span>
              <Button onClick={handleLogout} variant="secondary">
                Logout
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
