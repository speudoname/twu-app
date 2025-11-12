import React, { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const AdminSettings = () => {
  const [settings, setSettings] = useState({
    postmark_server_token: '',
    postmark_stream: 'outbound',
    sender_email: '',
    sender_name: '',
    reply_to_email: '',
  });

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const { user } = useAuth();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [settingsResponse, statsResponse] = await Promise.all([
        adminAPI.getSettings(),
        adminAPI.getStats(),
      ]);

      if (settingsResponse.data.success) {
        setSettings(settingsResponse.data.settings);
      }

      if (statsResponse.data.success) {
        setStats(statsResponse.data.stats);
      }
    } catch (error) {
      setError('Failed to load settings');
      console.error('Load settings error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSettingsChange = (e) => {
    const { name, value } = e.target;
    setSettings((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setSaving(true);

    try {
      const response = await adminAPI.updateSettings(settings);

      if (response.data.success) {
        setMessage('Settings saved successfully');
      } else {
        setError('Failed to save settings');
      }
    } catch (error) {
      setError('Failed to save settings');
      console.error('Save settings error:', error);
    }

    setSaving(false);
  };

  const handleTestEmail = async () => {
    if (!testEmail) {
      setError('Please enter an email address');
      return;
    }

    setError('');
    setMessage('');
    setTestingEmail(true);

    try {
      const response = await adminAPI.testEmail(testEmail);

      if (response.data.success) {
        setMessage('Test email sent successfully');
      } else {
        setError('Failed to send test email');
      }
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to send test email');
      console.error('Test email error:', error);
    }

    setTestingEmail(false);
  };

  if (loading) {
    return <div className="loading">Loading settings...</div>;
  }

  return (
    <div className="container">
      <div className="admin-panel">
        <h2>Admin Settings</h2>

        {stats && (
          <div className="stats-grid">
            <div className="stat-card">
              <h3>{stats.totalUsers}</h3>
              <p>Total Users</p>
            </div>
            <div className="stat-card">
              <h3>{stats.verifiedUsers}</h3>
              <p>Verified Users</p>
            </div>
            <div className="stat-card">
              <h3>{stats.totalTasks}</h3>
              <p>Total Tasks</p>
            </div>
            <div className="stat-card">
              <h3>{stats.completedTasks}</h3>
              <p>Completed Tasks</p>
            </div>
          </div>
        )}

        {error && <div className="error-message">{error}</div>}
        {message && <div className="success-message">{message}</div>}

        <form onSubmit={handleSaveSettings}>
          <h3 style={{ marginTop: 30, marginBottom: 20 }}>Email Settings (Postmark)</h3>

          <div className="form-group">
            <label htmlFor="postmark_server_token">
              Postmark Server API Token
            </label>
            <input
              type="text"
              id="postmark_server_token"
              name="postmark_server_token"
              value={settings.postmark_server_token}
              onChange={handleSettingsChange}
              placeholder="pm-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            />
          </div>

          <div className="form-group">
            <label htmlFor="postmark_stream">Postmark Stream</label>
            <input
              type="text"
              id="postmark_stream"
              name="postmark_stream"
              value={settings.postmark_stream}
              onChange={handleSettingsChange}
              placeholder="outbound"
            />
          </div>

          <div className="form-group">
            <label htmlFor="sender_email">Sender Email</label>
            <input
              type="email"
              id="sender_email"
              name="sender_email"
              value={settings.sender_email}
              onChange={handleSettingsChange}
              placeholder="noreply@yourdomain.com"
            />
          </div>

          <div className="form-group">
            <label htmlFor="sender_name">Sender Name</label>
            <input
              type="text"
              id="sender_name"
              name="sender_name"
              value={settings.sender_name}
              onChange={handleSettingsChange}
              placeholder="TWU"
            />
          </div>

          <div className="form-group">
            <label htmlFor="reply_to_email">Reply-To Email (optional)</label>
            <input
              type="email"
              id="reply_to_email"
              name="reply_to_email"
              value={settings.reply_to_email}
              onChange={handleSettingsChange}
              placeholder="support@yourdomain.com"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </form>

        <div style={{ marginTop: 40 }}>
          <h3>Test Email Configuration</h3>
          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <input
              type="email"
              placeholder="test@example.com"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              style={{ flex: 1 }}
            />
            <button
              className="btn btn-secondary"
              onClick={handleTestEmail}
              disabled={testingEmail}
            >
              {testingEmail ? 'Sending...' : 'Send Test Email'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;