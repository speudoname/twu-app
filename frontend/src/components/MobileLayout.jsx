import { useLocation } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { Inbox, CheckSquare, BookOpen, User } from 'lucide-react';

export default function MobileLayout({ children }) {
  const location = useLocation();

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
        padding: '0 4px',
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
            padding: '8px 10px',
            borderRadius: '12px',
            background: isActive('/inbox')
              ? 'rgba(102, 126, 234, 0.1)'
              : 'transparent',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '3px'
          }}>
            <Inbox
              size={22}
              color={isActive('/inbox') ? '#667eea' : '#8e8e93'}
              strokeWidth={isActive('/inbox') ? 2.5 : 2}
            />
            <div style={{
              fontSize: '10px',
              fontWeight: isActive('/inbox') ? '600' : '500',
              color: isActive('/inbox') ? '#667eea' : '#8e8e93',
              letterSpacing: '-0.2px',
              whiteSpace: 'nowrap'
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
            padding: '8px 10px',
            borderRadius: '12px',
            background: isActive('/tasks')
              ? 'rgba(102, 126, 234, 0.1)'
              : 'transparent',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '3px'
          }}>
            <CheckSquare
              size={22}
              color={isActive('/tasks') ? '#667eea' : '#8e8e93'}
              strokeWidth={isActive('/tasks') ? 2.5 : 2}
            />
            <div style={{
              fontSize: '10px',
              fontWeight: isActive('/tasks') ? '600' : '500',
              color: isActive('/tasks') ? '#667eea' : '#8e8e93',
              letterSpacing: '-0.2px',
              whiteSpace: 'nowrap'
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
            padding: '8px 10px',
            borderRadius: '12px',
            background: isActive('/memos')
              ? 'rgba(102, 126, 234, 0.1)'
              : 'transparent',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '3px'
          }}>
            <BookOpen
              size={22}
              color={isActive('/memos') ? '#667eea' : '#8e8e93'}
              strokeWidth={isActive('/memos') ? 2.5 : 2}
            />
            <div style={{
              fontSize: '10px',
              fontWeight: isActive('/memos') ? '600' : '500',
              color: isActive('/memos') ? '#667eea' : '#8e8e93',
              letterSpacing: '-0.2px',
              whiteSpace: 'nowrap'
            }}>
              Memos
            </div>
          </div>
        </Link>

        <Link
          to="/profile"
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
            padding: '8px 10px',
            borderRadius: '12px',
            background: isActive('/profile') || isActive('/admin/settings')
              ? 'rgba(102, 126, 234, 0.1)'
              : 'transparent',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '3px'
          }}>
            <User
              size={22}
              color={isActive('/profile') || isActive('/admin/settings') ? '#667eea' : '#8e8e93'}
              strokeWidth={isActive('/profile') || isActive('/admin/settings') ? 2.5 : 2}
            />
            <div style={{
              fontSize: '10px',
              fontWeight: isActive('/profile') || isActive('/admin/settings') ? '600' : '500',
              color: isActive('/profile') || isActive('/admin/settings') ? '#667eea' : '#8e8e93',
              letterSpacing: '-0.2px',
              whiteSpace: 'nowrap'
            }}>
              Profile
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
