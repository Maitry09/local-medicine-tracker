import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { orderAPI } from '../services/api';
import { useNotification } from '../context/NotificationContext';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const { showNotification } = useNotification();

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await orderAPI.getMyOrders();
      setOrders(response.data.orders);
    } catch (error) {
      showNotification('Failed to fetch orders', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return;
    
    try {
      await orderAPI.cancelOrder(orderId);
      showNotification('Order cancelled successfully', 'success');
      fetchOrders();
    } catch (error) {
      showNotification(error.response?.data?.message || 'Failed to cancel order', 'error');
    }
  };

  const getStatusBadge = (status) => {
    const statusColors = {
      pending: 'badge-warning',
      confirmed: 'badge-info',
      processing: 'badge-info',
      shipped: 'badge-primary',
      delivered: 'badge-success',
      cancelled: 'badge-danger',
    };
    return `badge ${statusColors[status] || 'badge-secondary'}`;
  };

  const filteredOrders = filter === 'all' 
    ? orders 
    : orders.filter(order => order.status === filter);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading orders...</p>
      </div>
    );
  }

  return (
    <div className="orders-page">
      <div className="page-header">
        <h1>My Orders</h1>
        <div className="filter-tabs">
          {['all', 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled'].map((status) => (
            <button
              key={status}
              className={`filter-tab ${filter === status ? 'active' : ''}`}
              onClick={() => setFilter(status)}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
            <line x1="12" y1="22.08" x2="12" y2="12" />
          </svg>
          <h2>No orders found</h2>
          <p>You haven&apos;t placed any orders yet.</p>
          <Link to="/search" className="btn btn-primary">
            Search Medicines
          </Link>
        </div>
      ) : (
        <div className="orders-list">
          {filteredOrders.map((order) => (
            <div key={order._id} className="order-card">
              <div className="order-header">
                <div>
                  <span className="order-id">Order #{order._id.slice(-8).toUpperCase()}</span>
                  <span className="order-date">
                    {new Date(order.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                <span className={getStatusBadge(order.status)}>{order.status}</span>
              </div>

              <div className="order-pharmacy">
                <strong>{order.pharmacy?.name}</strong>
                <span>{order.pharmacy?.address?.city}</span>
              </div>

              <div className="order-items">
                {order.items.slice(0, 3).map((item, index) => (
                  <div key={index} className="order-item-mini">
                    <span>{item.medicine?.name}</span>
                    <span>x{item.quantity}</span>
                  </div>
                ))}
                {order.items.length > 3 && (
                  <p className="more-items">+{order.items.length - 3} more items</p>
                )}
              </div>

              <div className="order-footer">
                <div className="order-total">
                  <span>Total:</span>
                  <strong>Rs. {order.totalAmount.toFixed(2)}</strong>
                </div>
                <div className="order-actions">
                  <Link to={`/orders/${order._id}`} className="btn btn-outline btn-sm">
                    View Details
                  </Link>
                  {order.status === 'pending' && (
                    <button
                      onClick={() => handleCancelOrder(order._id)}
                      className="btn btn-danger btn-sm"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Orders;
