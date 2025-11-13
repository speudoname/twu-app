import { useAuth } from '../contexts/AuthContext';

export default function Profile() {
  const { user } = useAuth();

  return (
    <div style={{
      minHeight: '100%',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div style={{
          background: 'white',
          borderRadius: '20px',
          padding: '40px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
        }}>
          <h1 style={{
            fontSize: '32px',
            fontWeight: '700',
            color: '#1f2937',
            marginBottom: '32px',
            textAlign: 'center'
          }}>
            👤 Profile
          </h1>

          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              color: '#6b7280',
              marginBottom: '8px'
            }}>
              Name
            </label>
            <div style={{
              padding: '16px',
              background: '#f9fafb',
              borderRadius: '12px',
              fontSize: '16px',
              color: '#1f2937'
            }}>
              {user?.name}
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              color: '#6b7280',
              marginBottom: '8px'
            }}>
              Email
            </label>
            <div style={{
              padding: '16px',
              background: '#f9fafb',
              borderRadius: '12px',
              fontSize: '16px',
              color: '#1f2937'
            }}>
              {user?.email}
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              color: '#6b7280',
              marginBottom: '8px'
            }}>
              Role
            </label>
            <div style={{
              padding: '16px',
              background: user?.is_admin ? '#dcfce7' : '#f9fafb',
              borderRadius: '12px',
              fontSize: '16px',
              color: user?.is_admin ? '#059669' : '#1f2937',
              fontWeight: user?.is_admin ? '600' : '400'
            }}>
              {user?.is_admin ? '⭐ Administrator' : '👤 User'}
            </div>
          </div>

          <div style={{
            marginTop: '32px',
            padding: '16px',
            background: '#eff6ff',
            borderRadius: '12px',
            fontSize: '14px',
            color: '#1e40af',
            textAlign: 'center'
          }}>
            Profile editing coming soon!
          </div>
        </div>
      </div>
    </div>
  );
}
