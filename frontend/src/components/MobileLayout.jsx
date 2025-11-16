import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Inbox, CheckSquare, BookOpen, User, Settings, LogOut, Menu, X } from 'lucide-react';

export default function MobileLayout({ children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
    setMenuOpen(false);
  };

  const isActive = (path) => location.pathname === path;

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: '#f5f7fa',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Top Bar - Glass Morphism */}
      <div style={{
        height: '64px',
        background: 'rgba(255, 255, 255, 0.7)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderBottom: '0.5px solid rgba(0, 0, 0, 0.04)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0 20px',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        boxShadow: '0 1px 0 0 rgba(0, 0, 0, 0.03)'
      }}>
        <div style={{
          fontSize: '22px',
          fontWeight: '600',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          letterSpacing: '-0.5px'
        }}>
          TWU
        </div>

        {/* Hamburger Menu Button */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          style={{
            background: menuOpen ? 'rgba(102, 126, 234, 0.1)' : 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '8px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            color: '#667eea'
          }}
        >
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Dropdown Menu - Glass Card */}
      {menuOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setMenuOpen(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.2)',
              backdropFilter: 'blur(5px)',
              WebkitBackdropFilter: 'blur(5px)',
              zIndex: 1001,
              animation: 'fadeIn 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          />

          {/* Glass Menu */}
          <div style={{
            position: 'fixed',
            top: '74px',
            right: '12px',
            width: '280px',
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(40px) saturate(180%)',
            WebkitBackdropFilter: 'blur(40px) saturate(180%)',
            borderRadius: '20px',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1), 0 1px 0 0 rgba(255, 255, 255, 0.5) inset',
            border: '0.5px solid rgba(255, 255, 255, 0.8)',
            zIndex: 1002,
            overflow: 'hidden',
            animation: 'slideDown 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }}>
            {/* User Info */}
            <div style={{
              padding: '20px',
              borderBottom: '0.5px solid rgba(0, 0, 0, 0.05)'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '12px',
                boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
              }}>
                <User size={24} color="white" />
              </div>
              <div style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#1a1a1a',
                marginBottom: '4px'
              }}>
                {user?.name || 'User'}
              </div>
              <div style={{
                fontSize: '13px',
                color: '#8e8e93',
                fontWeight: '400'
              }}>
                {user?.email}
              </div>
            </div>

            {/* Menu Items */}
            <div style={{ padding: '8px' }}>
              <Link
                to="/profile"
                onClick={() => setMenuOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '14px 12px',
                  color: '#1a1a1a',
                  textDecoration: 'none',
                  fontSize: '15px',
                  fontWeight: '500',
                  borderRadius: '12px',
                  transition: 'all 0.2s',
                  gap: '12px'
                }}
                onMouseEnter={(e) => e.target.style.background = 'rgba(0, 0, 0, 0.04)'}
                onMouseLeave={(e) => e.target.style.background = 'transparent'}
              >
                <User size={20} style={{ color: '#667eea' }} />
                Profile
              </Link>

              {user?.is_admin && (
                <Link
                  to="/admin/settings"
                  onClick={() => setMenuOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '14px 12px',
                    color: '#1a1a1a',
                    textDecoration: 'none',
                    fontSize: '15px',
                    fontWeight: '500',
                    borderRadius: '12px',
                    transition: 'all 0.2s',
                    gap: '12px'
                  }}
                  onMouseEnter={(e) => e.target.style.background = 'rgba(0, 0, 0, 0.04)'}
                  onMouseLeave={(e) => e.target.style.background = 'transparent'}
                >
                  <Settings size={20} style={{ color: '#667eea' }} />
                  Admin Panel
                </Link>
              )}

              <div style={{
                height: '0.5px',
                background: 'rgba(0, 0, 0, 0.05)',
                margin: '8px 0'
              }} />

              <button
                onClick={handleLogout}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  width: '100%',
                  padding: '14px 12px',
                  color: '#ff3b30',
                  background: 'transparent',
                  border: 'none',
                  fontSize: '15px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  borderRadius: '12px',
                  transition: 'all 0.2s',
                  gap: '12px'
                }}
                onMouseEnter={(e) => e.target.style.background = 'rgba(255, 59, 48, 0.1)'}
                onMouseLeave={(e) => e.target.style.background = 'transparent'}
              >
                <LogOut size={20} />
                Logout
              </button>
            </div>
          </div>
        </>
      )}

      {/* Main Content */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        paddingBottom: '80px',
        WebkitOverflowScrolling: 'touch'
      }}>
        {children}
      </div>

      {/* Bottom Navigation - Glass Morphism */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '80px',
        background: 'rgba(255, 255, 255, 0.7)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderTop: '0.5px solid rgba(0, 0, 0, 0.04)',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        padding: '0 20px',
        paddingBottom: 'env(safe-area-inset-bottom)',
        boxShadow: '0 -1px 0 0 rgba(0, 0, 0, 0.03)',
        zIndex: 100
      }}>
        <Link
          to="/inbox"
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            textDecoration: 'none',
            gap: '6px',
            position: 'relative'
          }}
        >
          <div style={{
            padding: '10px 24px',
            borderRadius: '14px',
            background: isActive('/inbox')
              ? 'rgba(102, 126, 234, 0.1)'
              : 'transparent',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px'
          }}>
            <Inbox
              size={24}
              color={isActive('/inbox') ? '#667eea' : '#8e8e93'}
              strokeWidth={isActive('/inbox') ? 2.5 : 2}
            />
            <div style={{
              fontSize: '11px',
              fontWeight: isActive('/inbox') ? '600' : '500',
              color: isActive('/inbox') ? '#667eea' : '#8e8e93',
              letterSpacing: '-0.2px'
            }}>
              Inbox
            </div>
          </div>
        </Link>

        <Link
          to="/tasks"
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            textDecoration: 'none',
            gap: '6px',
            position: 'relative'
          }}
        >
          <div style={{
            padding: '10px 24px',
            borderRadius: '14px',
            background: isActive('/tasks')
              ? 'rgba(102, 126, 234, 0.1)'
              : 'transparent',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px'
          }}>
            <CheckSquare
              size={24}
              color={isActive('/tasks') ? '#667eea' : '#8e8e93'}
              strokeWidth={isActive('/tasks') ? 2.5 : 2}
            />
            <div style={{
              fontSize: '11px',
              fontWeight: isActive('/tasks') ? '600' : '500',
              color: isActive('/tasks') ? '#667eea' : '#8e8e93',
              letterSpacing: '-0.2px'
            }}>
              Tasks
            </div>
          </div>
        </Link>

        <Link
          to="/memos"
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            textDecoration: 'none',
            gap: '6px',
            position: 'relative'
          }}
        >
          <div style={{
            padding: '10px 24px',
            borderRadius: '14px',
            background: isActive('/memos')
              ? 'rgba(102, 126, 234, 0.1)'
              : 'transparent',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px'
          }}>
            <BookOpen
              size={24}
              color={isActive('/memos') ? '#667eea' : '#8e8e93'}
              strokeWidth={isActive('/memos') ? 2.5 : 2}
            />
            <div style={{
              fontSize: '11px',
              fontWeight: isActive('/memos') ? '600' : '500',
              color: isActive('/memos') ? '#667eea' : '#8e8e93',
              letterSpacing: '-0.2px'
            }}>
              Memos
            </div>
          </div>
        </Link>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}
