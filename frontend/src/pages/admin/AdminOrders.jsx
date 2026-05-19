import { useState, useEffect } from 'react';
import { orderAPI } from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import '../../styles/admin.css';

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const { showNotification } = useNotification();

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;

    if (selectedOrder) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = previousOverflow;
    }

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [selectedOrder]);

  useEffect(() => {
    fetchOrders();
  }, [page, filter]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (filter !== 'all') params.status = filter;
      
      const response = await orderAPI.getAllOrders(params);
      setOrders(response.data?.data?.orders || []);
      setTotalPages(response.data?.data?.pagination?.pages || 1);
    } catch (error) {
      showNotification('Failed to fetch orders', 'error');
    } finally {
      setLoading(false);
    }
  };
  const getOrderTotal = (order) => {
      const totalFromItems = order.items?.reduce(
        (sum, item) => sum + Number(item.price ?? 0) * Number(item.quantity ?? 0),
        0
      );
      return Number(order.totalAmount ?? order.total ?? totalFromItems ?? 0);
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

  const getPrescriptionImageUrl = (imageUrl) => {
    if (!imageUrl) return '';
    return imageUrl.startsWith('http')
      ? imageUrl
      : `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5002'}${imageUrl}`;
  };

  const isPrescriptionPreviewable = (imageUrl) => {
    return imageUrl && !imageUrl.toLowerCase().endsWith('.pdf');
  };

  const totalRevenue = orders
    .filter((o) => o.paymentStatus === 'paid')
    .reduce((sum, o) => sum + getOrderTotal(o), 0);

  return (
    <div className="admin-orders-page">
      <div className="page-header">
        <h1>Orders Management</h1>
        <div className="header-stats">
          <div className="stat">
            <span>Total Revenue</span>
            <strong>Rs. {totalRevenue.toFixed(2)}</strong>
          </div>
        </div>
      </div>

      <div className="filter-tabs">
        {['all', 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'].map((status) => (
          <button
            key={status}
            className={`filter-tab ${filter === status ? 'active' : ''}`}
            onClick={() => {
              setFilter(status);
              setPage(1);
            }}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
        </div>
      ) : (
        <div className="orders-container">
          <div className="orders-table-container">
            <table className="orders-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Pharmacy</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order._id}>
                    <td>#{order._id.slice(-8).toUpperCase()}</td>
                    <td>{order.user?.name || order.customer?.name || '-'}</td>
                    <td>{order.pharmacy?.name}</td>
                    <td>{order.items?.length} items</td>
                    <td>Rs. {getOrderTotal(order).toFixed(2)}</td>
                    <td>
                      <span className={`badge ${order.paymentStatus === 'paid' ? 'badge-success' : 'badge-warning'}`}>
                        {order.paymentStatus}
                      </span>
                    </td>
                    <td>
                      <span className={getStatusBadge(order.status)}>{order.status}</span>
                    </td>
                    <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                    <td>
                      <button
                        onClick={async () => {
                          try {
                            const res = await orderAPI.getById(order._id);
                            setSelectedOrder(res.data?.data?.order || order);
                          } catch (err) {
                            setSelectedOrder(order);
                          }
                        }}
                        className="btn btn-outline btn-sm"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn btn-outline"
              >
                Previous
              </button>
              <span>
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="btn btn-outline"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="modal-overlay">
          <div className="modal modal-large">
            <div className="modal-header">
              <h2>Order #{selectedOrder._id.slice(-8).toUpperCase()}</h2>
              <button onClick={() => setSelectedOrder(null)} className="close-btn">
                &times;
              </button>
            </div>
            <div className="modal-content">
              <div className="order-detail-grid">
                <section>
                  <h3>Customer Information</h3>
                  <p><strong>Name:</strong> {selectedOrder.user?.name || selectedOrder.customer?.name}</p>
                  <p><strong>Email:</strong> {selectedOrder.user?.email || selectedOrder.customer?.email}</p>
                  <p><strong>Phone:</strong> {selectedOrder.user?.phone || selectedOrder.customer?.phone}</p>
                </section>

                <section>
                  <h3>Pharmacy Information</h3>
                  <p><strong>Name:</strong> {selectedOrder.pharmacy?.name}</p>
                  <p><strong>Phone:</strong> {selectedOrder.pharmacy?.phone}</p>
                  <p><strong>Location:</strong> {selectedOrder.pharmacy?.address?.city}</p>
                </section>

                <section>
                  <h3>Delivery Address</h3>
                  <p>{selectedOrder.deliveryAddress?.street}</p>
                  <p>{selectedOrder.deliveryAddress?.city}, {selectedOrder.deliveryAddress?.state}</p>
                  <p>PIN: {selectedOrder.deliveryAddress?.pincode}</p>
                </section>

                <section>
                  <h3>Payment Details</h3>
                  <p><strong>Method:</strong> {selectedOrder.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online'}</p>
                  <p>
                    <strong>Status:</strong>{' '}
                    <span className={`badge ${selectedOrder.paymentStatus === 'paid' ? 'badge-success' : 'badge-warning'}`}>
                      {selectedOrder.paymentStatus}
                    </span>
                  </p>
                  <p><strong>Total:</strong> Rs. {getOrderTotal(selectedOrder).toFixed(2)}</p>
                </section>
              </div>

              <section>
                <h3>Order Items</h3>
                <div className="order-items-list">
                  {selectedOrder.items?.map((item, index) => (
                    <div key={index} className="order-item">
                      <span className="item-name">{item.medicine?.name}</span>
                      <span className="item-qty">x{item.quantity}</span>
                      <span className="item-price">Rs. {(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </section>

              {selectedOrder.prescriptionImage && (
                <section>
                  <h3>Prescription</h3>
                  <div style={{ marginTop: 8 }}>
                    {isPrescriptionPreviewable(selectedOrder.prescriptionImage) ? (
                      <a href={getPrescriptionImageUrl(selectedOrder.prescriptionImage)} target="_blank" rel="noreferrer">
                        <img
                          src={getPrescriptionImageUrl(selectedOrder.prescriptionImage)}
                          alt="Prescription"
                          style={{ width: '100%', maxWidth: 520, borderRadius: 12, border: '1px solid #ddd', marginTop: 12 }}
                        />
                      </a>
                    ) : (
                      <a href={getPrescriptionImageUrl(selectedOrder.prescriptionImage)} target="_blank" rel="noreferrer" className="link">
                        View uploaded prescription document
                      </a>
                    )}
                  </div>
                  <p style={{ marginTop: 8, color: '#555' }}>
                    Prescription status: <strong>{selectedOrder.prescriptionStatus || 'pending'}</strong>
                  </p>
                </section>
              )}

              <section>
                <h3>Order Timeline</h3>
                <p><strong>Created:</strong> {new Date(selectedOrder.createdAt).toLocaleString()}</p>
                <p><strong>Last Updated:</strong> {new Date(selectedOrder.updatedAt).toLocaleString()}</p>
                <p>
                  <strong>Current Status:</strong>{' '}
                  <span className={getStatusBadge(selectedOrder.status)}>{selectedOrder.status}</span>
                </p>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOrders;