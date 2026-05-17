import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useNotification } from '../../context/NotificationContext';

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5002';

export default function PrescriptionReview() {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectingId, setRejectingId] = useState(null);
  const { showNotification } = useNotification();

  useEffect(() => { fetchPrescriptions(); }, []);

  const fetchPrescriptions = async () => {
    try {
      const res = await api.get('/prescriptions/pharmacy');
      setPrescriptions(res.data.data.prescriptions || []);
    } catch { showNotification('Failed to load prescriptions', 'error'); }
    finally { setLoading(false); }
  };

  const handleReview = async (id, status, reason = '') => {
    try {
      await api.patch(`/prescriptions/${id}/review`, { status, rejectionReason: reason });
      showNotification(`Prescription ${status}`, 'success', 3000);
      setRejectingId(null);
      fetchPrescriptions();
    } catch (err) {
      showNotification(err.response?.data?.message || 'Action failed', 'error');
    }
  };

  const filtered = prescriptions.filter(p => filter === 'all' || p.status === filter);

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;

  return (
    <div style={{ padding: '1.5rem' }}>
      <h2>Prescription Reviews</h2>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {['pending', 'approved', 'rejected', 'all'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-outline'}`}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
            <span style={{ marginLeft: 4, background: 'rgba(0,0,0,0.1)', borderRadius: 10, padding: '0 6px', fontSize: 12 }}>
              {f === 'all' ? prescriptions.length : prescriptions.filter(p => p.status === f).length}
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <h3>No {filter} prescriptions</h3>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {filtered.map(p => (
            <div key={p._id} className="card">
              <div className="card-body">
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  {/* Image */}
                  <div style={{ flexShrink: 0 }}>
                    <a href={`${API_BASE}${p.imageUrl}`} target="_blank" rel="noreferrer">
                      <img src={`${API_BASE}${p.imageUrl}`} alt="Prescription"
                        style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 8, border: '1px solid #eee' }}
                        onError={e => { e.target.style.display = 'none'; }} />
                    </a>
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                      <div>
                        <strong>{p.patient?.name}</strong>
                        <p style={{ margin: '2px 0', fontSize: 14, color: '#666' }}>{p.patient?.email} · {p.patient?.phone}</p>
                        <p style={{ margin: '2px 0', fontSize: 14 }}>
                          Order: <strong>#{p.order?.orderNumber?.slice(-8).toUpperCase()}</strong> — Rs. {p.order?.totalAmount}
                        </p>
                        <p style={{ margin: '4px 0', fontSize: 12, color: '#999' }}>
                          Submitted: {new Date(p.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <span style={{
                        padding: '4px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600,
                        background: p.status === 'pending' ? '#fff3e0' : p.status === 'approved' ? '#e8f5e9' : '#ffebee',
                        color: p.status === 'pending' ? '#e65100' : p.status === 'approved' ? '#2e7d32' : '#c62828'
                      }}>
                        {p.status.toUpperCase()}
                      </span>
                    </div>

                    {p.status === 'pending' && (
                      <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button className="btn btn-sm" style={{ background: '#2e7d32', color: 'white' }}
                          onClick={() => handleReview(p._id, 'approved')}>
                          ✅ Approve
                        </button>
                        <button className="btn btn-sm btn-outline" style={{ color: '#c62828', borderColor: '#c62828' }}
                          onClick={() => setRejectingId(rejectingId === p._id ? null : p._id)}>
                          ❌ Reject
                        </button>
                      </div>
                    )}

                    {rejectingId === p._id && (
                      <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
                        <input className="form-input" placeholder="Reason for rejection..."
                          value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} style={{ flex: 1 }} />
                        <button className="btn btn-sm" style={{ background: '#c62828', color: 'white' }}
                          onClick={() => handleReview(p._id, 'rejected', rejectionReason)}
                          disabled={!rejectionReason.trim()}>
                          Confirm Reject
                        </button>
                      </div>
                    )}

                    {p.status === 'rejected' && p.rejectionReason && (
                      <p style={{ marginTop: '0.5rem', fontSize: 13, color: '#c62828' }}>
                        <strong>Reason:</strong> {p.rejectionReason}
                      </p>
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
