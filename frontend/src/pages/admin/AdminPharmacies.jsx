import { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import { useNotification } from '../../context/NotificationContext';

const AdminPharmacies = () => {
  const [pharmacies, setPharmacies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedPharmacy, setSelectedPharmacy] = useState(null);
  const { showNotification } = useNotification();

  useEffect(() => {
    fetchPharmacies();
  }, [filter]);

  const fetchPharmacies = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filter === 'pending') params.isVerified = false;
      if (filter === 'verified') params.isVerified = true;
      
      const response = await adminAPI.getAllPharmacies(params);
      setPharmacies(response.data?.data?.pharmacies || []);
    } catch (error) {
      showNotification('Failed to fetch pharmacies', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (pharmacyId) => {
    try {
      await adminAPI.updatePharmacy(pharmacyId, { isVerified: true });
      showNotification('Pharmacy verified successfully', 'success');
      fetchPharmacies();
    } catch (error) {
      showNotification('Failed to verify pharmacy', 'error');
    }
  };

  const handleReject = async (pharmacyId) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;
    
    try {
      await adminAPI.updatePharmacy(pharmacyId, { isVerified: false, isActive: false });
      showNotification('Pharmacy rejected', 'success');
      fetchPharmacies();
    } catch (error) {
      showNotification('Failed to reject pharmacy', 'error');
    }
  };

  const handleToggleStatus = async (pharmacyId, currentStatus) => {
    try {
      await adminAPI.updatePharmacy(pharmacyId, { isActive: !currentStatus });
      showNotification('Pharmacy status updated', 'success');
      fetchPharmacies();
    } catch (error) {
      showNotification('Failed to update pharmacy status', 'error');
    }
  };

  return (
    <div className="admin-pharmacies-page">
      <div className="page-header">
        <h1>Pharmacies Management</h1>
      </div>

      <div className="filter-tabs">
        <button
          className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All Pharmacies
        </button>
        <button
          className={`filter-tab ${filter === 'pending' ? 'active' : ''}`}
          onClick={() => setFilter('pending')}
        >
          Pending Verification
          {pharmacies.filter((p) => !p.isVerified).length > 0 && (
            <span className="count">{pharmacies.filter((p) => !p.isVerified).length}</span>
          )}
        </button>
        <button
          className={`filter-tab ${filter === 'verified' ? 'active' : ''}`}
          onClick={() => setFilter('verified')}
        >
          Verified
        </button>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
        </div>
      ) : (
        <div className="pharmacies-grid">
          <div className="pharmacies-list">
            {pharmacies.map((pharmacy) => (
              <div
                key={pharmacy._id}
                className={`pharmacy-card ${selectedPharmacy?._id === pharmacy._id ? 'selected' : ''}`}
                onClick={() => setSelectedPharmacy(pharmacy)}
              >
                <div className="pharmacy-header">
                  <h3>{pharmacy.name}</h3>
                  <div className="badges">
                    <span className={`badge ${pharmacy.isVerified ? 'badge-success' : 'badge-warning'}`}>
                      {pharmacy.isVerified ? 'Verified' : 'Pending'}
                    </span>
                    <span className={`badge ${pharmacy.isOpen ? 'badge-success' : 'badge-secondary'}`}>
                      {pharmacy.isOpen ? 'Open' : 'Closed'}
                    </span>
                  </div>
                </div>
                <p className="pharmacy-address">
                  {pharmacy.address?.city}, {pharmacy.address?.state}
                </p>
                <p className="pharmacy-license">License: {pharmacy.licenseNumber}</p>
                <p className="pharmacy-owner">Owner: {pharmacy.owner?.name}</p>
              </div>
            ))}
          </div>

          {selectedPharmacy && (
            <div className="pharmacy-details-panel">
              <div className="panel-header">
                <h2>{selectedPharmacy.name}</h2>
                <button onClick={() => setSelectedPharmacy(null)} className="close-btn">
                  &times;
                </button>
              </div>

              <div className="panel-content">
                <section>
                  <h3>Basic Info</h3>
                  <p><strong>License:</strong> {selectedPharmacy.licenseNumber}</p>
                  <p><strong>Phone:</strong> {selectedPharmacy.phone}</p>
                  <p><strong>Email:</strong> {selectedPharmacy.email || 'N/A'}</p>
                </section>

                <section>
                  <h3>Address</h3>
                  <p>{selectedPharmacy.address?.street}</p>
                  <p>{selectedPharmacy.address?.city}, {selectedPharmacy.address?.state}</p>
                  <p>PIN: {selectedPharmacy.address?.pincode}</p>
                </section>

                <section>
                  <h3>Owner Details</h3>
                  <p><strong>Name:</strong> {selectedPharmacy.owner?.name}</p>
                  <p><strong>Email:</strong> {selectedPharmacy.owner?.email}</p>
                  <p><strong>Phone:</strong> {selectedPharmacy.owner?.phone}</p>
                </section>

                <section>
                  <h3>Operating Hours</h3>
                  <p>
                    {selectedPharmacy.operatingHours?.open} - {selectedPharmacy.operatingHours?.close}
                  </p>
                </section>

                <div className="panel-actions">
                  {!selectedPharmacy.isVerified ? (
                    <>
                      <button
                        onClick={() => handleVerify(selectedPharmacy._id)}
                        className="btn btn-success"
                      >
                        Verify Pharmacy
                      </button>
                      <button
                        onClick={() => handleReject(selectedPharmacy._id)}
                        className="btn btn-danger"
                      >
                        Reject
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleToggleStatus(selectedPharmacy._id, selectedPharmacy.isOpen)}
                      className={`btn ${selectedPharmacy.isOpen ? 'btn-outline' : 'btn-success'}`}
                    >
                      {selectedPharmacy.isOpen ? 'Set as Closed' : 'Set as Open'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminPharmacies;
