import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import '../../styles/admin.css';

const AdminPrescriptions = () => {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const { showNotification } = useNotification();

  useEffect(() => {
    fetchPrescriptions();
  }, [filter]);

  const fetchPrescriptions = async () => {
    setLoading(true);
    try {
      const response = await api.get('/prescriptions/admin');
      setPrescriptions(response.data?.data?.prescriptions || []);
    } catch (err) {
      showNotification('Failed to load prescriptions', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getImageUrl = (imageUrl) => {
    if (!imageUrl) return '';
    return imageUrl.startsWith('http')
      ? imageUrl
      : `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5002'}${imageUrl}`;
  };

  const filteredPrescriptions = prescriptions.filter((item) => {
    if (filter === 'all') return true;
    return item.status === filter;
  });

  return (
    <div className="admin-orders-page">
      <div className="page-header">
        <div>
          <h1>Prescription Uploads</h1>
          <p className="text-muted">Review prescriptions uploaded by patients and open images directly.</p>
        </div>
      </div>

      <div className="filter-tabs" style={{ marginBottom: 16 }}>
        {['all', 'pending', 'approved', 'rejected'].map((status) => (
          <button
            key={status}
            className={`filter-tab ${filter === status ? 'active' : ''}`}
            onClick={() => setFilter(status)}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
        </div>
      ) : filteredPrescriptions.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📄</div>
          <h3>No prescriptions found</h3>
        </div>
      ) : (
        <div className="orders-table-container">
          <table className="orders-table">
            <thead>
              <tr>
                <th>Prescription</th>
                <th>Patient</th>
                <th>Pharmacy Responses</th>
                <th>Uploaded</th>
              </tr>
            </thead>
            <tbody>
              {filteredPrescriptions.map((prescription) => {
                const pharmacyNames = prescription.responses?.map((response) => response.pharmacy?.name || response.pharmacyName).filter(Boolean);
                const responseSummaries = prescription.responses?.map((response) => `${response.pharmacy?.name || response.pharmacyName}: ${response.status || 'submitted'}`).filter(Boolean).join(', ');
                const latestResponse = prescription.responses?.length ? prescription.responses[prescription.responses.length - 1] : null;
                return (
                  <tr key={prescription._id}>
                    <td>
                      <a
                        href={getImageUrl(prescription.imageUrl)}
                        target="_blank"
                        rel="noreferrer"
                        className="link"
                      >
                        View image
                      </a>
                    </td>
                    <td>{prescription.patient?.name || prescription.patient?.email || 'Unknown'}</td>
                    <td>
                      {responseSummaries ? (
                        <div>
                          <div>{responseSummaries}</div>
                          {latestResponse?.message && (
                            <div style={{ marginTop: 4, fontSize: 12, color: '#6b7280' }}>
                              {latestResponse.message.length > 60
                                ? `${latestResponse.message.slice(0, 60)}...`
                                : latestResponse.message}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted">No replies yet</span>
                      )}
                    </td>
                    <td>{new Date(prescription.createdAt).toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminPrescriptions;
