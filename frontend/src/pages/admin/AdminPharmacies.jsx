import { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import '../../styles/admin.css';

const AdminPharmacies = () => {
  const [pharmacies, setPharmacies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedPharmacy, setSelectedPharmacy] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const { showNotification } = useNotification();

  useEffect(() => {
    fetchPharmacies();
  }, [filter]);

  const fetchPharmacies = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filter === 'pending') params.status = 'pending';
      if (filter === 'verified') params.status = 'approved';
      
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
      await adminAPI.updatePharmacy(pharmacyId, { status: 'approved' });
      showNotification('Pharmacy approved successfully', 'success');
      fetchPharmacies();
    } catch (error) {
      showNotification('Failed to approve pharmacy', 'error');
    }
  };

  const openRejectModal = (pharmacy) => {
    setSelectedPharmacy(pharmacy);
    setRejectionReason('');
    setShowRejectModal(true);
  };

  const handleReject = async () => {
    if (!selectedPharmacy || !rejectionReason.trim()) return;
    try {
      await adminAPI.updatePharmacy(selectedPharmacy._id, { status: 'rejected', isActive: false, rejectionReason });
      showNotification('Pharmacy rejected successfully', 'success');
      setShowRejectModal(false);
      fetchPharmacies();
    } catch (error) {
      showNotification('Failed to reject pharmacy', 'error');
    }
  };

  const handleToggleStatus = async (pharmacyId, currentStatus, mode = 'permanent') => {
    // Toggle permanentClose when mode === 'permanent'
    try {
      const payload = {};
      if (mode === 'permanent') {
        payload.permanentClose = !currentStatus; // Toggle the current status
      } else {
        // fallback toggle isActive
        payload.isActive = !currentStatus;
      }

      await adminAPI.updatePharmacy(pharmacyId, payload);
      showNotification('Pharmacy status updated', 'success');
      fetchPharmacies();
    } catch (error) {
      showNotification('Failed to update pharmacy status', 'error');
    }
  };

  const handleTempClose = async (pharmacyId, hours = 1) => {
    try {
      const until = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
      await adminAPI.updatePharmacy(pharmacyId, { tempCloseUntil: until });
      showNotification(`Pharmacy temporarily closed for ${hours} hour(s)`, 'success');
      fetchPharmacies();
    } catch (error) {
      showNotification('Failed to temp-close pharmacy', 'error');
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
          {pharmacies.filter((p) => p.status === 'pending').length > 0 && (
            <span className="count">{pharmacies.filter((p) => p.status === 'pending').length}</span>
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
                  <span className={`badge ${pharmacy.status === 'approved' ? 'badge-success' : pharmacy.status === 'rejected' ? 'badge-danger' : pharmacy.status === 'disabled' ? 'badge-secondary' : 'badge-warning'}`}>
                    {pharmacy.status === 'approved' ? 'Approved' : pharmacy.status === 'rejected' ? 'Rejected' : pharmacy.status === 'disabled' ? 'Disabled' : 'Pending'}
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
                  <p><strong>Phone:</strong> {selectedPharmacy.phone || selectedPharmacy.owner?.phone || '-'}</p>
                  <p><strong>Email:</strong> {selectedPharmacy.email || selectedPharmacy.owner?.email || 'N/A'}</p>
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

                <section>
                  <h3>Status</h3>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <span className={`badge ${selectedPharmacy.permanentClose ? 'badge-danger' : 'badge-success'}`}>
                      {selectedPharmacy.permanentClose ? '🔒 Permanently Closed' : '✅ Open'}
                    </span>
                    {selectedPharmacy.tempCloseUntil && new Date(selectedPharmacy.tempCloseUntil) > new Date() && (
                      <span className={`badge badge-warning`}>
                        ⏱️ Temp Closed until {new Date(selectedPharmacy.tempCloseUntil).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                </section>

                <div className="panel-actions">
                  {selectedPharmacy.status === 'pending' ? (
                    <>
                      <button
                        onClick={() => handleVerify(selectedPharmacy._id)}
                        className="btn btn-success"
                      >
                        Approve Pharmacy
                      </button>
                      <button
                        onClick={() => openRejectModal(selectedPharmacy)}
                        className="btn btn-danger"
                      >
                        Reject
                      </button>
                    </>
                  ) : selectedPharmacy.status === 'approved' ? (
                    <>
                      {selectedPharmacy.permanentClose ? (
                        <button
                          onClick={() => handleToggleStatus(selectedPharmacy._id, false, 'permanent')}
                          className="btn btn-success"
                        >
                          Reopen Pharmacy
                        </button>
                      ) : (
                        <button
                          onClick={() => handleToggleStatus(selectedPharmacy._id, true, 'permanent')}
                          className="btn btn-danger"
                        >
                          Set Permanent Close
                        </button>
                      )}

                      <button
                        onClick={() => handleTempClose(selectedPharmacy._id, 1)}
                        className="btn btn-outline"
                        style={{ marginLeft: 8 }}
                      >
                        Temporarily Close 1h
                      </button>
                    </>
                  ) : (null)}
                </div>
              </div>
            </div>
          )}
          {showRejectModal && (
            <div className="modal-backdrop" onClick={() => setShowRejectModal(false)}>
              <div className="modal reject-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                  <h3>Reject Pharmacy Application</h3>
                  <button onClick={() => setShowRejectModal(false)} className="close-btn">&times;</button>
                </div>
                <div className="modal-body">
                  <p>Provide a reason for rejecting <strong>{selectedPharmacy?.name}</strong>:</p>
                  <textarea 
                    value={rejectionReason} 
                    onChange={e => setRejectionReason(e.target.value)} 
                    placeholder="Enter rejection reason..."
                    rows={5} 
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #ddd', fontFamily: 'inherit' }}
                  />
                </div>
                <div className="modal-footer" style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
                  <button className="btn btn-outline" onClick={() => setShowRejectModal(false)}>Cancel</button>
                  <button className="btn btn-danger" onClick={handleReject} disabled={!rejectionReason.trim()}>Reject Pharmacy</button>
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