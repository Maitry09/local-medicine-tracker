import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';

export default function OrderDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrderDetails();
  }, [id]);

  const fetchOrderDetails = async () => {
    try {
      const response = await api.get(`/orders/${id}`);
      setOrder(response.data.data.order);
    } catch (error) {
      console.error('Failed to fetch order:', error);
      navigate('/patient/orders');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'status-pending',
      confirmed: 'status-confirmed',
      processing: 'status-processing',
      ready: 'status-ready',
      out_for_delivery: 'status-delivery',
      delivered: 'status-delivered',
      cancelled: 'status-cancelled'
    };
    return colors[status] || 'status-pending';
  };

  const handleCancelOrder = async () => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return;
    
    try {
      await api.put(`/orders/${id}/cancel`);
      fetchOrderDetails();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to cancel order');
    }
  };

  const orderSteps = [
    { key: 'pending', label: 'Order Placed' },
    { key: 'confirmed', label: 'Confirmed' },
    { key: 'processing', label: 'Processing' },
    { key: 'ready', label: 'Ready' },
    { key: 'out_for_delivery', label: 'Out for Delivery' },
    { key: 'delivered', label: 'Delivered' }
  ];

  const getStepStatus = (stepKey) => {
    if (order?.status === 'cancelled') return 'cancelled';
    const currentIndex = orderSteps.findIndex(s => s.key === order?.status);
    const stepIndex = orderSteps.findIndex(s => s.key === stepKey);
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'current';
    return 'pending';
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading order details...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="empty-state">
        <h3>Order not found</h3>
        <Link to="/patient/orders" className="btn btn-primary">Back to Orders</Link>
      </div>
    );
  }

  return (
    <div className="order-details-page">
      <div className="page-header">
        <Link to="/patient/orders" className="back-link">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back to Orders
        </Link>
        <h1>Order #{order.orderNumber}</h1>
      </div>

      <div className="order-status-section">
        <div className="status-header">
          <span className={`status-badge large ${getStatusColor(order.status)}`}>
            {order.status?.replace(/_/g, ' ')}
          </span>
          <span className="order-date">
            Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </span>
        </div>

        {order.status !== 'cancelled' && (
          <div className="order-timeline">
            {orderSteps.map((step, index) => (
              <div key={step.key} className={`timeline-step ${getStepStatus(step.key)}`}>
                <div className="step-indicator">
                  {getStepStatus(step.key) === 'completed' ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>
                <span className="step-label">{step.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="order-content">
        <div className="order-main">
          <div className="detail-card">
            <h3>Order Items</h3>
            <div className="items-list">
              {order.items?.map((item, index) => (
                <div key={index} className="order-item">
                  <div className="item-info">
                    <h4>{item.medicine?.name || 'Medicine'}</h4>
                    <p className="item-meta">
                      {item.medicine?.manufacturer} | {item.medicine?.dosageForm}
                    </p>
                  </div>
                  <div className="item-pricing">
                    <span className="quantity">Qty: {item.quantity}</span>
                    <span className="price">₹{item.price?.toFixed(2)}</span>
                    <span className="subtotal">₹{(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="order-summary">
              <div className="summary-row">
                <span>Subtotal</span>
                <span>₹{order.subtotal?.toFixed(2)}</span>
              </div>
              {order.discount > 0 && (
                <div className="summary-row discount">
                  <span>Discount</span>
                  <span>-₹{order.discount?.toFixed(2)}</span>
                </div>
              )}
              <div className="summary-row">
                <span>Delivery Fee</span>
                <span>{order.deliveryFee > 0 ? `₹${order.deliveryFee?.toFixed(2)}` : 'Free'}</span>
              </div>
              <div className="summary-row total">
                <span>Total</span>
                <span>₹{order.totalAmount?.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {order.deliveryAddress && (
            <div className="detail-card">
              <h3>Delivery Address</h3>
              <div className="address-info">
                <p className="address-type">{order.deliveryAddress.type || 'Home'}</p>
                <p>{order.deliveryAddress.street}</p>
                <p>{order.deliveryAddress.city}, {order.deliveryAddress.state} {order.deliveryAddress.pincode}</p>
                {order.deliveryAddress.landmark && (
                  <p className="landmark">Landmark: {order.deliveryAddress.landmark}</p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="order-sidebar">
          <div className="detail-card">
            <h3>Pharmacy Details</h3>
            <div className="pharmacy-info">
              <h4>{order.pharmacy?.name}</h4>
              <p>{order.pharmacy?.address?.street}</p>
              <p>{order.pharmacy?.address?.city}, {order.pharmacy?.address?.state}</p>
              {order.pharmacy?.phone && (
                <a href={`tel:${order.pharmacy.phone}`} className="phone-link">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                  </svg>
                  {order.pharmacy.phone}
                </a>
              )}
            </div>
          </div>

          <div className="detail-card">
            <h3>Payment Info</h3>
            <div className="payment-info">
              <div className="info-row">
                <span>Method</span>
                <span>{order.paymentMethod?.replace(/_/g, ' ') || 'Online'}</span>
              </div>
              <div className="info-row">
                <span>Status</span>
                <span className={`payment-status ${order.paymentStatus}`}>
                  {order.paymentStatus}
                </span>
              </div>
              {order.paymentId && (
                <div className="info-row">
                  <span>Transaction ID</span>
                  <span className="transaction-id">{order.paymentId}</span>
                </div>
              )}
            </div>
          </div>

          {order.status === 'pending' && (
            <button className="btn btn-danger btn-full" onClick={handleCancelOrder}>
              Cancel Order
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
