import { useState, useEffect } from 'react';
import { reviewAPI } from '../services/api';

export default function Reviews() {
  const [reviews, setReviews] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchReviews = async (p = 1) => {
    setLoading(true);
    try {
      const res = await reviewAPI.getAll({ page: p, limit: 20 });
      setReviews(res.data.data.reviews || []);
      setPages(res.data.data.pagination?.pages || 1);
    } catch (err) {
      console.error('Failed to fetch reviews', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReviews(page); }, [page]);

  return (
    <div className="container" style={{ padding: '2rem 1rem' }}>
      <div className="page-header">
        <h1>Customer Reviews</h1>
        <p className="text-muted">Browse reviews across pharmacies</p>
      </div>

      {loading ? <p>Loading...</p> : (
        <div>
          {reviews.length === 0 ? (
            <p>No reviews yet.</p>
          ) : (
            <div className="reviews-list">
              {reviews.map(r => (
                <div key={r._id} className="card" style={{ marginBottom: '1rem' }}>
                  <div className="card-body">
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <strong>{r.user?.name || 'Anonymous'}</strong>
                      <span>{new Date(r.createdAt).toLocaleString()}</span>
                    </div>
                    <div style={{ marginTop: '0.5rem' }}>
                      <div>Pharmacy: {r.pharmacy?.name || '-'}</div>
                      <div>Rating: {r.rating} / 5</div>
                      <p style={{ marginTop: '0.5rem' }}>{r.comment}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {pages > 1 && (
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <button disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="btn btn-outline">Previous</button>
              <span>Page {page} of {pages}</span>
              <button disabled={page === pages} onClick={() => setPage(p => Math.min(pages, p + 1))} className="btn btn-outline">Next</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
