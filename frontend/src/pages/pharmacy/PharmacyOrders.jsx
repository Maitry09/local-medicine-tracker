import { useState, useEffect } from 'react';
import { orderAPI } from '../../services/api';
import { useNotification } from '../../context/NotificationContext';

const PharmacyOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const { showNotification } = useNotification();

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await orderAPI.getPharmacyOrders();
      setOrders(response.data.orders);
    } catch (error) {
      showNotification('Failed to fetch orders', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      await orderAPI.updateOrderStatus(orderId, newStatus);
      showNotification('Order status updated', 'success');
      fetchOrders();
    } catch (error) {
      showNotification('Failed to update order status', 'error');
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      pending: 'badge-warning',
      confirmed: 'badge-info',
      processing: 'badge-info',
      shipped: 'badge-primary',
      delivered: 'badge-success',
      cancelled: 'badge-danger',
    };
    return `badge ${colors[status] || 'badge-secondary'}`;
  };

  const getNextStatus = (currentStatus) => {
    const flow = {
      pending: 'confirmed',
      confirmed: 'processing',
      processing: 'shipped',
      shipped: 'delivered',
    };
    return flow[currentStatus];
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
    <div className="pharmacy-orders-page">
      <div className="page-header">
        <h1>Orders Management</h1>
      </div>

      <div className="filter-tabs">
        {['all', 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'].map((status) => (
          <button
            key={status}
            className={`filter-tab ${filter === status ? 'active' : ''}`}
            onClick={() => setFilter(status)}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
            {status !== 'all' && (
              <span className="count">
                {orders.filter((o) => o.status === status).length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="orders-grid">
        <div className="orders-list-container">
          {filteredOrders.length === 0 ? (
            <div className="empty-state">
              <p>No orders found</p>
            </div>
          ) : (
            <div className="orders-list">
              {filteredOrders.map((order) => (
                <div
                  key={order._id}
                  className={`order-card ${selectedOrder?._id === order._id ? 'selected' : ''}`}
                  onClick={() => setSelectedOrder(order)}
                >
                  <div className="order-header">
                    <span className="order-id">#{order._id.slice(-8).toUpperCase()}</span>
                    <span className={getStatusBadge(order.status)}>{order.status}</span>
                  </div>
                  <div className="order-customer">
                    <strong>{order.customer?.name}</strong>
                    <span>{order.customer?.phone}</span>
                  </div>
                  <div className="order-meta">
                    <span>{order.items.length} items</span>
                    <span>Rs. {order.totalAmount.toFixed(2)}</span>
                  </div>
                  <div className="order-date">
                    {new Date(order.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedOrder && (
          <div className="order-details-panel">
            <div className="panel-header">
              <h2>Order #{selectedOrder._id.slice(-8).toUpperCase()}</h2>
              <button onClick={() => setSelectedOrder(null)} className="close-btn">
                &times;
              </button>
            </div>

            <div className="panel-content">
              <section>
                <h3>Customer Details</h3>
                <p><strong>Name:</strong> {selectedOrder.customer?.name}</p>
                <p><strong>Phone:</strong> {selectedOrder.customer?.phone}</p>
                <p><strong>Email:</strong> {selectedOrder.customer?.email}</p>
              </section>

              <section>
                <h3>Delivery Address</h3>
                <p>{selectedOrder.deliveryAddress?.street}</p>
                <p>{selectedOrder.deliveryAddress?.city}, {selectedOrder.deliveryAddress?.state}</p>
                <p>PIN: {selectedOrder.deliveryAddress?.pincode}</p>
              </section>

              <section>
                <h3>Order Items</h3>
                <div className="items-list">
                  {selectedOrder.items.map((item, index) => (
                    <div key={index} className="item-row">
                      <span className="item-name">{item.medicine?.name}</span>
                      <span className="item-qty">x{item.quantity}</span>
                      <span className="item-price">Rs. {(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h3>Payment</h3>
                <p><strong>Method:</strong> {selectedOrder.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online'}</p>
                <p>
                  <strong>Status:</strong>{' '}
                  <span className={`badge ${selectedOrder.paymentStatus === 'paid' ? 'badge-success' : 'badge-warning'}`}>
                    {selectedOrder.paymentStatus}
                  </span>
                </p>
                <p><strong>Total:</strong> Rs. {selectedOrder.totalAmount.toFixed(2)}</p>
              </section>

              {selectedOrder.status !== 'delivered' && selectedOrder.status !== 'cancelled' && (
                <div className="panel-actions">
                  <button
                    onClick={() => handleStatusUpdate(selectedOrder._id, getNextStatus(selectedOrder.status))}
                    className="btn btn-primary"
                  >
                    Mark as {getNextStatus(selectedOrder.status)}
                  </button>
                  {selectedOrder.status === 'pending' && (
                    <button
                      onClick={() => handleStatusUpdate(selectedOrder._id, 'cancelled')}
                      className="btn btn-danger"
                    >
                      Cancel Order
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PharmacyOrders;
