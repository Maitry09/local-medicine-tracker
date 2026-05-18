import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { pharmacyAPI, reviewAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useNotification } from '../context/NotificationContext';

// ─── Message Popup ────────────────────────────────────────────────────────────
const MessagePopup = ({ type, message, onClose }) => {
  const bg = type === 'confirm' ? '#1e40af' : type === 'error' ? '#dc2626' : '#16a34a';
  return (
    <div className="modal-overlay" onClick={type !== 'confirm' ? onClose : undefined}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 400, padding: '2rem', textAlign: 'center', borderTop: `4px solid ${bg}` }}
      >
        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>
          {type === 'confirm' ? '⚠️' : type === 'error' ? '❌' : '✅'}
        </div>
        <p style={{ fontSize: '1rem', marginBottom: '1.5rem', color: '#374151' }}>{message}</p>
        {type === 'confirm' ? (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
            <button className="btn btn-outline" onClick={onClose?.onCancel}>Cancel</button>
            <button className="btn btn-danger" onClick={onClose?.onConfirm}>Delete</button>
          </div>
        ) : (
          <button className="btn btn-primary" onClick={onClose}>OK</button>
        )}
      </div>
    </div>
  );
};

const PharmacyDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const { success } = useNotification();

  const [pharmacy, setPharmacy] = useState(null);
  const [stock, setStock] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewData, setReviewData] = useState({ rating: 5, comment: '' });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [editingReviewId, setEditingReviewId] = useState(null);

  // Popup state: { type: 'info'|'error'|'confirm', message, onClose }
  const [popup, setPopup] = useState(null);

  useEffect(() => {
    fetchPharmacyDetails();
    fetchReviews();
  }, [id]);

  const showPopup = (type, message, onClose) => setPopup({ type, message, onClose });
  const closePopup = () => setPopup(null);

  const fetchPharmacyDetails = async () => {
    setLoading(true);
    try {
      const [pharmacyRes, stockRes] = await Promise.all([
        pharmacyAPI.getById(id),
        pharmacyAPI.getStock(id, { inStock: 'true', limit: 100 })
      ]);
      setPharmacy(pharmacyRes.data.data.pharmacy);
      setStock(stockRes.data.data.stock);
    } catch (error) {
      console.error('Failed to fetch pharmacy:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      const res = await reviewAPI.getByPharmacy(id, { limit: 10 });
      setReviews(res.data.data.reviews || []);
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
    }
  };

  const handleSubmitReview = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (!reviewData.comment.trim()) {
      showPopup('error', 'Please enter a review comment.', closePopup);
      return;
    }

    if (reviewData.comment.trim().length < 10) {
      showPopup('error', 'Review must be at least 10 characters long.', closePopup);
      return;
    }

    setSubmittingReview(true);

    try {
      if (editingReviewId) {
        await reviewAPI.update(editingReviewId, {
          rating: reviewData.rating,
          comment: reviewData.comment
        });
        setShowReviewModal(false);
        setReviewData({ rating: 5, comment: '' });
        setEditingReviewId(null);
        fetchReviews();
        showPopup('info', 'Your review has been updated successfully!', closePopup);
      } else {
        await reviewAPI.create({
          pharmacyId: id,
          rating: reviewData.rating,
          comment: reviewData.comment
        });
        setShowReviewModal(false);
        setReviewData({ rating: 5, comment: '' });
        setEditingReviewId(null);
        fetchReviews();
        showPopup('info', `Thank you! Your review for ${pharmacy?.name} has been submitted.`, closePopup);
      }
    } catch (error) {
      console.error('Failed to submit review:', error);
      showPopup('error', error.response?.data?.message || 'Failed to submit review. Please try again.', closePopup);
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleEditReview = (review) => {
    setReviewData({ rating: review.rating, comment: review.comment });
    setEditingReviewId(review._id);
    setShowReviewModal(true);
  };

  const handleDeleteReview = (reviewId) => {
    showPopup('confirm', 'Are you sure you want to delete this review? This action cannot be undone.', {
      onConfirm: async () => {
        closePopup();
        try {
          await reviewAPI.delete(reviewId);
          success('Review deleted successfully');
          fetchReviews();
        } catch (error) {
          console.error('Failed to delete review:', error);
          showPopup('error', error.response?.data?.message || 'Failed to delete review.', closePopup);
        }
      },
      onCancel: closePopup,
    });
  };

  const handleAddToCart = (stockItem) => {
    if (!user) {
      navigate('/login');
      return;
    }

    const pharmacyId = pharmacy?._id;
    const pharmacyName = pharmacy?.name || 'Pharmacy';
    const basePrice = Number(stockItem.price || 0);
    const discount = Number(stockItem.discount || 0);
    const displayPrice = Number((basePrice * (1 - discount / 100)).toFixed(2));

    const added = addToCart({
      _id: `${stockItem.medicine._id}-${pharmacyId}`,
      medicineId: stockItem.medicine._id,
      pharmacyId,
      pharmacyName,
      name: stockItem.medicine.name,
      image: stockItem.medicine.image,
      quantity: 1,
      price: displayPrice,
      pharmacyPrice: displayPrice,
      discount,
      selectedStore: pharmacyName,
      stock: stockItem.quantity
    });

    if (added) {
      success(`${stockItem.medicine.name} added to cart`);
    }
  };

  const filteredStock = stock.filter(item => {
    const matchesSearch = !searchQuery ||
      item.medicine.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.medicine.genericName && item.medicine.genericName.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = !selectedCategory || item.medicine.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = [...new Set(stock.map(item => item.medicine.category))];

  const isOpen = () => {
    if (!pharmacy) return false;
    if (pharmacy.operatingHours.is24Hours) return true;
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const [openHour, openMin] = pharmacy.operatingHours.open.split(':').map(Number);
    const [closeHour, closeMin] = pharmacy.operatingHours.close.split(':').map(Number);
    return currentTime >= openHour * 60 + openMin && currentTime <= closeHour * 60 + closeMin;
  };

  if (loading) {
    return (
      <div className="container" style={{ padding: '4rem 1rem', textAlign: 'center' }}>
        <div className="spinner"></div>
        <p className="mt-3 text-muted">Loading pharmacy details...</p>
      </div>
    );
  }

  if (!pharmacy) {
    return (
      <div className="container" style={{ padding: '4rem 1rem' }}>
        <div className="empty-state">
          <h3>Pharmacy not found</h3>
          <Link to="/pharmacies" className="btn btn-primary mt-3">Back to Pharmacies</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '2rem 1rem' }}>
      {/* Message Popup */}
      {popup && (
        <MessagePopup type={popup.type} message={popup.message} onClose={popup.onClose} />
      )}

      {/* Pharmacy Info */}
      <div className="card mb-4">
        <div className="card-body" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '2rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <h1 style={{ marginBottom: 0 }}>{pharmacy.name}</h1>
                {pharmacy.status === 'approved' && (
                  <span className="badge badge-success">Verified</span>
                )}
              </div>
              <p className="text-muted" style={{ marginBottom: '0.5rem' }}>
                {pharmacy.address.street}, {pharmacy.address.city}, {pharmacy.address.state} - {pharmacy.address.pincode}
              </p>
              <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                <div>
                  <p className="text-sm text-muted">Phone</p>
                  <p className="font-bold">{pharmacy.phone}</p>
                </div>
                <div>
                  <p className="text-sm text-muted">Email</p>
                  <p className="font-bold">{pharmacy.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted">Hours</p>
                  <p className="font-bold">
                    {pharmacy.operatingHours.is24Hours
                      ? '24 Hours'
                      : `${pharmacy.operatingHours.open} - ${pharmacy.operatingHours.close}`}
                  </p>
                </div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="pharmacy-status" style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>
                <span className={`status-dot ${isOpen() ? 'open' : 'closed'}`}></span>
                {isOpen() ? 'Open Now' : 'Closed'}
              </div>
              {pharmacy.rating > 0 && (
                <div>
                  <span style={{ color: '#ffc107', fontSize: '1.25rem' }}>★</span>
                  <span className="font-bold" style={{ fontSize: '1.25rem' }}> {pharmacy.rating.toFixed(1)}</span>
                  <p className="text-muted text-sm">{pharmacy.totalRatings} reviews</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Review Summary */}
      <div className="card mb-4">
        <div className="card-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ marginBottom: '0.5rem' }}>Customer Reviews</h2>
            <p className="text-muted" style={{ margin: 0 }}>
              {reviews.length} review{reviews.length === 1 ? '' : 's'} available.
            </p>
          </div>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => {
              if (!user) {
                navigate('/login');
                return;
              }
              setReviewData({ rating: 5, comment: '' });
              setEditingReviewId(null);
              setShowReviewModal(true);
            }}
          >
            Write a Review
          </button>
        </div>
      </div>

      {reviews.length > 0 && (
        <div className="card mb-4">
          <div className="card-body">
            {reviews.slice(0, 3).map((review) => (
              <div key={review._id} style={{ marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.25rem' }}>
                      <strong>{review.user?.name || 'Customer'}</strong>
                      <span style={{ color: '#ffc107' }}>★ {review.rating.toFixed(1)}</span>
                    </div>
                    <p className="text-muted" style={{ margin: '0.25rem 0', fontSize: '0.875rem' }}>
                      {new Date(review.createdAt).toLocaleDateString('en-IN')}
                      {review.editCount > 0 && <span style={{ marginLeft: '0.5rem', fontStyle: 'italic' }}>(edited)</span>}
                    </p>
                    <p style={{ marginTop: '0.5rem' }}>{review.comment}</p>
                  </div>
                  {user && review.user?._id === user._id && (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => handleEditReview(review)}
                        disabled={review.editCount >= 1}
                        title={review.editCount >= 1 ? 'Review can only be edited once' : 'Edit review'}
                        style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}
                      >
                        {review.editCount >= 1 ? '✓ Edited' : 'Edit'}
                      </button>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => handleDeleteReview(review._id)}
                        style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem', color: '#dc2626', borderColor: '#dc2626' }}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {reviews.length > 3 && (
              <p className="text-muted" style={{ margin: 0 }}>
                Showing 3 of {reviews.length} reviews.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Stock Search */}
      <div className="card mb-4">
        <div className="card-body">
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 300px' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Search medicines in this pharmacy..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div style={{ flex: '0 1 200px' }}>
              <select
                className="form-select"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Stock List */}
      <h2 className="mb-3">Available Medicines ({filteredStock.length})</h2>

      {filteredStock.length > 0 ? (
        <div className="grid grid-3">
          {filteredStock.map((item) => (
            <div key={item._id} className="card">
              <div className="card-body">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span className="badge badge-primary">{item.medicine.category}</span>
                  {item.quantity < 10 && (
                    <span className="badge badge-warning">Low Stock</span>
                  )}
                </div>
                <Link to={`/medicines/${item.medicine._id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <h4 className="medicine-name">{item.medicine.name}</h4>
                </Link>
                {item.medicine.genericName && (
                  <p className="medicine-generic">{item.medicine.genericName}</p>
                )}
                <p className="text-sm text-muted mb-2">{item.medicine.manufacturer}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                  <div>
                    <span className="medicine-price">
                      Rs. {(item.price - (item.price * (item.discount || 0) / 100)).toFixed(2)}
                    </span>
                    {item.discount > 0 && (
                      <span className="medicine-mrp">Rs. {item.price}</span>
                    )}
                  </div>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleAddToCart(item)}
                  >
                    Add
                  </button>
                </div>
                <p className="text-xs text-muted mt-2">
                  {item.quantity} units available
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card">
          <div className="card-body text-center" style={{ padding: '3rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💊</div>
            <h3>No medicines found</h3>
            <p className="text-muted">Try adjusting your search or filters</p>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && (
        <div className="modal-overlay" onClick={() => setShowReviewModal(false)}>
          <div className="modal-content review-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingReviewId ? 'Edit Review' : 'Review'} — {pharmacy?.name}</h2>
              <button className="close-btn" onClick={() => setShowReviewModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="review-section">
                <label className="review-label">Rating *</label>
                <div className="rating-stars">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      className={`star ${reviewData.rating >= star ? 'active' : ''}`}
                      onClick={() => setReviewData({ ...reviewData, rating: star })}
                      type="button"
                    >
                      ★
                    </button>
                  ))}
                </div>
                <p className="rating-value">{reviewData.rating} out of 5 stars</p>
              </div>
              <div className="review-section">
                <label className="review-label">Your Review *</label>
                <textarea
                  className="review-textarea"
                  placeholder="Share your experience with this pharmacy..."
                  value={reviewData.comment}
                  onChange={(e) => setReviewData({ ...reviewData, comment: e.target.value })}
                  rows={4}
                />
                <p className="char-count">{reviewData.comment.length} characters (min 10)</p>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowReviewModal(false)} disabled={submittingReview}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSubmitReview}
                disabled={submittingReview || reviewData.comment.trim().length < 10}
              >
                {submittingReview ? 'Submitting...' : editingReviewId ? 'Update Review' : 'Submit Review'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Back Button */}
      <div style={{ marginTop: '2rem' }}>
        <Link to="/pharmacies" className="btn btn-outline">
          &larr; Back to Pharmacies
        </Link>
      </div>
    </div>
  );
};

export default PharmacyDetails;