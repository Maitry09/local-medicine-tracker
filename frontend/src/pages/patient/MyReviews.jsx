import { useState, useEffect } from 'react';
import { reviewAPI } from '../../services/api';
import { useNotification } from '../../context/NotificationContext';

export default function MyReviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showNotification } = useNotification();

  const fetchMyReviews = async () => {
    setLoading(true);
    try {
      const res = await reviewAPI.getMyReviews({ page: 1, limit: 50 });
      setReviews(res.data.data.reviews || []);
    } catch (err) {
      console.error('Failed to fetch my reviews', err);
      showNotification('Failed to load your reviews', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMyReviews(); }, []);

  return (
    <div className="container" style={{ padding: '2rem 1rem' }}>
      <div className="page-header">
        <h1>My Reviews</h1>
        <p className="text-muted">All reviews you've written</p>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div>
          {reviews.length === 0 ? (
            <p>You have not written any reviews yet.</p>
          ) : (
            <div className="reviews-list">
              {reviews.map(r => (
                <div key={r._id} className="card" style={{ marginBottom: '1rem' }}>
                  <div className="card-body">
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <strong>{r.pharmacy?.name || 'Pharmacy'}</strong>
                      <span>{new Date(r.createdAt).toLocaleString()}</span>
                    </div>
                    <div style={{ marginTop: '0.5rem' }}>
                      <div>Rating: {r.rating} / 5</div>
                      <p style={{ marginTop: '0.5rem' }}>{r.comment}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
