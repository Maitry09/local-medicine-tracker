import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { orderAPI } from '../services/api';
import { useNotification } from '../context/NotificationContext';

const OrderDetails = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const { showNotification } = useNotification();

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const fetchOrder = async () => {
    try {
      const response = await orderAPI.getOrderById(id);
      setOrder(response.data.order);
    } catch (error) {
      showNotification('Failed to fetch order details', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getStatusStep = (status) => {
    const steps = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];
    return steps.indexOf(status);
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
      <div className="error-container">
        <h2>Order not found</h2>
        <Link to="/orders" className="btn btn-primary">
          Back to Orders
        </Link>
      </div>
    );
  }

  const currentStep = getStatusStep(order.status);
  const isCancelled = order.status === 'cancelled';

  return (
    <div className="order-details-page">
      <div className="page-header">
        <Link to="/orders" className="back-link">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to Orders
        </Link>
        <h1>Order #{order._id.slice(-8).toUpperCase()}</h1>
      </div>

      {!isCancelled && (
        <div className="order-progress">
          <div className="progress-track">
            {['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered'].map((step, index) => (
              <div
                key={step}
                className={`progress-step ${index <= currentStep ? 'completed' : ''} ${
                  index === currentStep ? 'current' : ''
                }`}
              >
                <div className="step-dot">
                  {index < currentStep ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>
                <span className="step-label">{step}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {isCancelled && (
        <div className="cancelled-banner">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          <span>This order has been cancelled</span>
        </div>
      )}

      <div className="order-details-content">
        <div className="details-main">
          <section className="details-section">
            <h2>Order Items</h2>
            <div className="items-list">
              {order.items.map((item, index) => (
                <div key={index} className="detail-item">
                  <img
                    src={item.medicine?.image || '/medicine-placeholder.png'}
                    alt={item.medicine?.name}
                  />
                  <div className="item-info">
                    <h4>{item.medicine?.name}</h4>
                    <p>{item.medicine?.manufacturer}</p>
                    <p className="item-qty">Quantity: {item.quantity}</p>
                  </div>
                  <div className="item-price">
                    <p>Rs. {item.price.toFixed(2)}</p>
                    <span>Total: Rs. {(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="details-section">
            <h2>Delivery Address</h2>
            <div className="address-info">
              <p>{order.deliveryAddress?.street}</p>
              <p>{order.deliveryAddress?.city}, {order.deliveryAddress?.state}</p>
              <p>PIN: {order.deliveryAddress?.pincode}</p>
            </div>
          </section>
        </div>

        <div className="details-sidebar">
          <div className="summary-card">
            <h3>Order Summary</h3>
            <div className="summary-row">
              <span>Order Date</span>
              <span>
                {new Date(order.createdAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>
            <div className="summary-row">
              <span>Payment Method</span>
              <span>{order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment'}</span>
            </div>
            <div className="summary-row">
              <span>Payment Status</span>
              <span className={`badge ${order.paymentStatus === 'paid' ? 'badge-success' : 'badge-warning'}`}>
                {order.paymentStatus}
              </span>
            </div>
            <hr />
            <div className="summary-row">
              <span>Subtotal</span>
              <span>Rs. {(order.totalAmount - 40).toFixed(2)}</span>
            </div>
            <div className="summary-row">
              <span>Delivery Fee</span>
              <span>Rs. 40.00</span>
            </div>
            <div className="summary-row total">
              <span>Total</span>
              <span>Rs. {order.totalAmount.toFixed(2)}</span>
            </div>
          </div>

          <div className="pharmacy-card">
            <h3>Pharmacy Details</h3>
            <p className="pharmacy-name">{order.pharmacy?.name}</p>
            <p>{order.pharmacy?.address?.street}</p>
            <p>{order.pharmacy?.address?.city}, {order.pharmacy?.address?.state}</p>
            <p>Phone: {order.pharmacy?.phone}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetails;
