import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { userAPI, alertAPI } from '../services/api';

const Profile = () => {
  const { user, logout } = useAuth();
  const { showNotification } = useNotification();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [alerts, setAlerts] = useState([]);
  
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    address: {
      street: '',
      city: '',
      state: '',
      pincode: '',
    },
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        address: user.address || {
          street: '',
          city: '',
          state: '',
          pincode: '',
        },
      });
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === 'alerts') {
      fetchAlerts();
    }
  }, [activeTab]);

  const fetchAlerts = async () => {
    try {
      const response = await alertAPI.getMyAlerts();
      setAlerts(response.data.alerts);
    } catch (error) {
      showNotification('Failed to fetch alerts', 'error');
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await userAPI.updateProfile(profileData);
      showNotification('Profile updated successfully', 'success');
    } catch (error) {
      showNotification(error.response?.data?.message || 'Failed to update profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showNotification('Passwords do not match', 'error');
      return;
    }

    setLoading(true);

    try {
      await userAPI.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      showNotification('Password changed successfully', 'success');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      showNotification(error.response?.data?.message || 'Failed to change password', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAlert = async (alertId) => {
    try {
      await alertAPI.deleteAlert(alertId);
      showNotification('Alert deleted', 'success');
      fetchAlerts();
    } catch (error) {
      showNotification('Failed to delete alert', 'error');
    }
  };

  return (
    <div className="profile-page">
      <div className="profile-header">
        <div className="profile-avatar">
          <span>{user?.name?.charAt(0).toUpperCase()}</span>
        </div>
        <div className="profile-info">
          <h1>{user?.name}</h1>
          <p>{user?.email}</p>
        </div>
      </div>

      <div className="profile-tabs">
        <button
          className={`tab ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          Profile
        </button>
        <button
          className={`tab ${activeTab === 'security' ? 'active' : ''}`}
          onClick={() => setActiveTab('security')}
        >
          Security
        </button>
        <button
          className={`tab ${activeTab === 'alerts' ? 'active' : ''}`}
          onClick={() => setActiveTab('alerts')}
        >
          My Alerts
        </button>
      </div>

      <div className="profile-content">
        {activeTab === 'profile' && (
          <form onSubmit={handleProfileSubmit} className="profile-form">
            <h2>Personal Information</h2>
            <div className="form-row">
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  value={profileData.name}
                  onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Phone Number</label>
                <input
                  type="tel"
                  value={profileData.phone}
                  onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                />
              </div>
            </div>
            <div className="form-group">
              <label>Email Address</label>
              <input type="email" value={profileData.email} disabled autoComplete="email" />
              <span className="form-hint">Email cannot be changed</span>
            </div>

            <h3>Address</h3>
            <div className="form-group">
              <label>Street Address</label>
              <input
                type="text"
                value={profileData.address.street}
                onChange={(e) =>
                  setProfileData({
                    ...profileData,
                    address: { ...profileData.address, street: e.target.value },
                  })
                }
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>City</label>
                <input
                  type="text"
                  value={profileData.address.city}
                  onChange={(e) =>
                    setProfileData({
                      ...profileData,
                      address: { ...profileData.address, city: e.target.value },
                    })
                  }
                />
              </div>
              <div className="form-group">
                <label>State</label>
                <input
                  type="text"
                  value={profileData.address.state}
                  onChange={(e) =>
                    setProfileData({
                      ...profileData,
                      address: { ...profileData.address, state: e.target.value },
                    })
                  }
                />
              </div>
              <div className="form-group">
                <label>PIN Code</label>
                <input
                  type="text"
                  value={profileData.address.pincode}
                  onChange={(e) =>
                    setProfileData({
                      ...profileData,
                      address: { ...profileData.address, pincode: e.target.value },
                    })
                  }
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        )}

        {activeTab === 'security' && (
          <div className="security-section">
            <form onSubmit={handlePasswordSubmit} className="password-form">
              <h2>Change Password</h2>
              <div className="form-group">
                <label>Current Password</label>
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, currentPassword: e.target.value })
                  }
                  autoComplete="current-password"
                  required
                />
              </div>
              <div className="form-group">
                <label>New Password</label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, newPassword: e.target.value })
                  }
                  autoComplete="new-password"
                  required
                />
              </div>
              <div className="form-group">
                <label>Confirm New Password</label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                  }
                  autoComplete="new-password"
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Changing...' : 'Change Password'}
              </button>
            </form>

            <div className="danger-zone">
              <h2>Danger Zone</h2>
              <p>Logging out will end your current session.</p>
              <button onClick={logout} className="btn btn-danger">
                Logout
              </button>
            </div>
          </div>
        )}

        {activeTab === 'alerts' && (
          <div className="alerts-section">
            <h2>Medicine Availability Alerts</h2>
            {alerts.length === 0 ? (
              <div className="empty-alerts">
                <p>You haven&apos;t set up any alerts yet.</p>
                <p>Set alerts from medicine details page to get notified when they become available.</p>
              </div>
            ) : (
              <div className="alerts-list">
                {alerts.map((alert) => (
                  <div key={alert._id} className="alert-card">
                    <div className="alert-info">
                      <h4>{alert.medicine?.name}</h4>
                      <p>Location: {alert.location?.city || 'Any'}</p>
                      <p>
                        Status:{' '}
                        <span className={`badge ${alert.isActive ? 'badge-success' : 'badge-secondary'}`}>
                          {alert.isActive ? 'Active' : 'Triggered'}
                        </span>
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteAlert(alert._id)}
                      className="btn btn-outline btn-sm"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
