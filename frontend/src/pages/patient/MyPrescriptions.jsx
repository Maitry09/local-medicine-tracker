import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useNotification } from '../../context/NotificationContext';
import { prescriptionAPI } from '../../services/api';

export default function MyPrescriptions() {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showNotification } = useNotification();

  useEffect(() => {
    fetchPrescriptions();
  }, []);

  const fetchPrescriptions = async () => {
    try {
      setLoading(true);
      const response = await prescriptionAPI.getMyPrescriptions();
      setPrescriptions(response.data?.data?.prescriptions || []);
    } catch (error) {
      showNotification(error.response?.data?.message || 'Failed to load prescriptions', 'error');
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
  
  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
        <p>Loading your prescriptions...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2>My Prescription Requests</h2>
          <p className="text-muted">Review uploaded prescriptions and pharmacy replies in one place.</p>
        </div>
        <Link to="/patient/prescription-upload" className="btn btn-primary">
          Upload a New Prescription
        </Link>
      </div>

      {prescriptions.length === 0 ? (
        <div className="empty-state" style={{ marginTop: 24 }}>
          <div className="empty-state-icon">📄</div>
          <h3>No prescription requests yet</h3>
          <p className="text-muted">Upload a prescription to receive pharmacy responses and medicine suggestions.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem', marginTop: 16 }}>
          {prescriptions.map((prescription) => (
            <div key={prescription._id} className="card">
              <div className="card-body">
                <div style={{ display: 'grid', gap: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                    <div>
                      <h3 style={{ margin: 0 }}>Prescription #{prescription._id.slice(-8).toUpperCase()}</h3>
                      <p style={{ margin: '6px 0 0', color: '#6b7280', fontSize: 14 }}>
                        {prescription.order ? `Order ${prescription.order.orderNumber?.slice(-8).toUpperCase()}` : 'Independent upload'}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr auto', alignItems: 'start' }}>
                    <div>
                      <p style={{ margin: '0 0 8px' }}><strong>Uploaded</strong> {new Date(prescription.createdAt).toLocaleString()}</p>
                      {prescription.rejectionReason && (
                        <p style={{ margin: 0, color: '#b42318', fontSize: 14 }}><strong>Rejected Reason:</strong> {prescription.rejectionReason}</p>
                      )}
                    </div>
                    <div style={{ minWidth: 140, display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      <a href={getImageUrl(prescription.imageUrl)} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">
                        View File
                      </a>
                      {!!prescription.order && (
                        <Link to={`/orders/${prescription.order._id}`} className="btn btn-sm btn-primary">
                          View Order
                        </Link>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gap: 10 }}>
                    <div style={{ display: 'grid', gap: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 600 }}>Pharmacy assigned:</span>
                        <span>{prescription.pharmacy?.name || 'Open for any pharmacy'}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 600 }}>Responses:</span>
                        <span>{prescription.responses?.length || 0}</span>
                      </div>
                    </div>

                    {prescription.responses?.length > 0 ? (
                      <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 12 }}>
                        <h4 style={{ margin: '0 0 10px' }}>Pharmacy Responses</h4>
                        {prescription.responses.map((response, index) => (
                          <div key={`${response.pharmacy?._id || response.pharmacyName}-${index}`} style={{ marginBottom: 12, padding: 12, borderRadius: 12, background: '#fafafa' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                              <strong>{response.pharmacy?.name || response.pharmacyName}</strong>
                              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                                <span style={{ fontSize: 12, color: '#6b7280' }}>{new Date(response.createdAt).toLocaleString()}</span>
                                <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: 11, textTransform: 'capitalize', background: response.status === 'approved' ? '#e6f4ea' : response.status === 'rejected' ? '#fdecea' : '#eef2ff', color: response.status === 'approved' ? '#166534' : response.status === 'rejected' ? '#991b1b' : '#1d4ed8' }}>
                                  {response.status || 'approved'}
                                </span>
                              </div>
                            </div>

                            {response.message && <p style={{ margin: '8px 0 0' }}>{response.message}</p>}
                            {response.pricingDetails && (
                              <p style={{ margin: '8px 0 0', fontStyle: 'italic', color: '#374151' }}>
                                {response.pricingDetails}
                              </p>
                            )}

                            {response.suggestedMedicines?.length > 0 && (
                              <div style={{ marginTop: 10 }}>
                                <div style={{ marginBottom: 8, fontWeight: 600 }}>Suggested Medicines</div>
                                <div style={{ display: 'grid', gap: 8 }}>
                                  {response.suggestedMedicines.map((item) => (
                                    <div key={`${item.medicine || item.name}-${item.note || item.price}`} style={{ padding: 10, borderRadius: 10, background: '#fff', border: '1px solid #e5e7eb' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                                        <span>{item.name || 'Unnamed medicine'}</span>
                                        <span style={{ fontWeight: 700 }}>Rs. {item.price?.toFixed?.(2) ?? item.price}</span>
                                      </div>
                                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 6, color: item.available ? '#15803d' : '#b42318', fontSize: 13 }}>
                                        <span>{item.available ? 'Available' : 'Unavailable'}</span>
                                        {item.note && <span>{item.note}</span>}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ padding: 12, borderRadius: 12, background: '#f9fafb' }}>
                        No responses have been submitted yet. You will see pharmacy replies here as they arrive.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
