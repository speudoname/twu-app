import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Navbar = () => {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <nav className="navbar">
      <div className="container">
        <div className="navbar-content">
          <Link to="/tasks" className="navbar-brand">
            TWU
          </Link>

          <div className="navbar-nav">
            <Link
              to="/tasks"
              className={location.pathname === '/tasks' ? 'active' : ''}
            >
              Tasks
            </Link>

            {isAdmin && (
              <Link
                to="/admin/settings"
                className={location.pathname === '/admin/settings' ? 'active' : ''}
              >
                Admin
              </Link>
            )}

            <span style={{ color: '#757575' }}>
              {user?.name || user?.email}
            </span>

            <button
              onClick={handleLogout}
              className="btn btn-secondary"
              style={{ padding: '6px 16px' }}
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;