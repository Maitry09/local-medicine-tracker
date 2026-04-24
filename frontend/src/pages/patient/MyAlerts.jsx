import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

export default function MyAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('active');

  useEffect(() => {
    fetchAlerts();
  }, [filter]);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/alerts/my-alerts');
      let filteredAlerts = response.data.data.alerts || [];
      
      if (filter === 'active') {
        filteredAlerts = filteredAlerts.filter(a => a.isActive);
      } else if (filter === 'triggered') {
        filteredAlerts = filteredAlerts.filter(a => a.isTriggered);
      }
      
      setAlerts(filteredAlerts);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAlert = async (alertId, isActive) => {
    try {
      await api.put(`/alerts/${alertId}`, { isActive: !isActive });
      fetchAlerts();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to update alert');
    }
  };

  const handleDeleteAlert = async (alertId) => {
    if (!window.confirm('Are you sure you want to delete this alert?')) return;
    
    try {
      await api.delete(`/alerts/${alertId}`);
      fetchAlerts();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to delete alert');
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading alerts...</p>
      </div>
    );
  }

  return (
    <div className="my-alerts-page">
      <div className="page-header">
        <div>
          <h1>Medicine Alerts</h1>
          <p>Get notified when medicines become available</p>
        </div>
      </div>

      <div className="filters-bar">
        <div className="filter-tabs">
          <button
            className={`filter-tab ${filter === 'active' ? 'active' : ''}`}
            onClick={() => setFilter('active')}
          >
            Active Alerts
          </button>
          <button
            className={`filter-tab ${filter === 'triggered' ? 'active' : ''}`}
            onClick={() => setFilter('triggered')}
          >
            Triggered
          </button>
          <button
            className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All Alerts
          </button>
        </div>
      </div>

      {alerts.length === 0 ? (
        <div className="empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="empty-icon">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
          </svg>
          <h3>No alerts found</h3>
          <p>Set up alerts when searching for medicines to get notified when they become available.</p>
          <Link to="/search" className="btn btn-primary">Search Medicines</Link>
        </div>
      ) : (
        <div className="alerts-grid">
          {alerts.map(alert => (
            <div key={alert._id} className={`alert-card ${alert.isTriggered ? 'triggered' : ''}`}>
              <div className="alert-header">
                <div className="medicine-info">
                  <h3>{alert.medicine?.name || 'Medicine'}</h3>
                  <p className="medicine-meta">
                    {alert.medicine?.manufacturer} | {alert.medicine?.dosageForm}
                  </p>
                </div>
                <div className="alert-status">
                  {alert.isTriggered && (
                    <span className="triggered-badge">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Available
                    </span>
                  )}
                </div>
              </div>

              <div className="alert-body">
                <div className="alert-details">
                  <div className="detail-item">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                    </svg>
                    <span>Within {alert.radius || 5} km radius</span>
                  </div>
                  <div className="detail-item">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                    </svg>
                    <span>Created {new Date(alert.createdAt).toLocaleDateString()}</span>
                  </div>
                  {alert.notificationChannels && (
                    <div className="detail-item">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                      </svg>
                      <span>
                        {alert.notificationChannels.join(', ')}
                      </span>
                    </div>
                  )}
                </div>

                {alert.isTriggered && alert.availableAt && (
                  <div className="available-pharmacies">
                    <h4>Available at:</h4>
                    <div className="pharmacy-list">
                      {alert.availableAt.slice(0, 3).map((pharmacy, idx) => (
                        <Link 
                          key={idx} 
                          to={`/pharmacy/${pharmacy._id || pharmacy}`}
                          className="pharmacy-link"
                        >
                          {pharmacy.name || 'View Pharmacy'}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="alert-footer">
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={alert.isActive}
                    onChange={() => handleToggleAlert(alert._id, alert.isActive)}
                  />
                  <span className="toggle-slider"></span>
                  <span className="toggle-label">{alert.isActive ? 'Active' : 'Paused'}</span>
                </label>
                <button 
                  className="btn btn-outline btn-sm btn-danger"
                  onClick={() => handleDeleteAlert(alert._id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
