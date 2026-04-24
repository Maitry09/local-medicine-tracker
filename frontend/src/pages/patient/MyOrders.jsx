import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

export default function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchOrders();
  }, [filter, page]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10'
      });
      if (filter !== 'all') {
        params.append('status', filter);
      }
      
      const response = await api.get(`/orders/my-orders?${params}`);
      setOrders(response.data.data.orders || []);
      setTotalPages(response.data.data.totalPages || 1);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
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

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return;
    
    try {
      await api.put(`/orders/${orderId}/cancel`);
      fetchOrders();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to cancel order');
    }
  };

  const statusFilters = [
    { value: 'all', label: 'All Orders' },
    { value: 'pending', label: 'Pending' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'processing', label: 'Processing' },
    { value: 'ready', label: 'Ready' },
    { value: 'out_for_delivery', label: 'Out for Delivery' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  if (loading && orders.length === 0) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading orders...</p>
      </div>
    );
  }

  return (
    <div className="my-orders-page">
      <div className="page-header">
        <h1>My Orders</h1>
        <p>Track and manage your medicine orders</p>
      </div>

      <div className="filters-bar">
        <div className="filter-tabs">
          {statusFilters.map(f => (
            <button
              key={f.value}
              className={`filter-tab ${filter === f.value ? 'active' : ''}`}
              onClick={() => { setFilter(f.value); setPage(1); }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="empty-icon">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
          </svg>
          <h3>No orders found</h3>
          <p>You haven&apos;t placed any orders yet.</p>
          <Link to="/search" className="btn btn-primary">Search Medicines</Link>
        </div>
      ) : (
        <>
          <div className="orders-list">
            {orders.map(order => (
              <div key={order._id} className="order-card">
                <div className="order-header">
                  <div className="order-meta">
                    <span className="order-number">Order #{order.orderNumber}</span>
                    <span className="order-date">
                      {new Date(order.createdAt).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <span className={`status-badge ${getStatusColor(order.status)}`}>
                    {order.status?.replace(/_/g, ' ')}
                  </span>
                </div>

                <div className="order-body">
                  <div className="pharmacy-info">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
                    </svg>
                    <span>{order.pharmacy?.name || 'Pharmacy'}</span>
                  </div>

                  <div className="order-items-preview">
                    {order.items?.slice(0, 3).map((item, idx) => (
                      <span key={idx} className="item-name">
                        {item.medicine?.name || 'Medicine'} x{item.quantity}
                      </span>
                    ))}
                    {order.items?.length > 3 && (
                      <span className="more-items">+{order.items.length - 3} more</span>
                    )}
                  </div>
                </div>

                <div className="order-footer">
                  <div className="order-total">
                    <span className="label">Total:</span>
                    <span className="amount">₹{order.totalAmount?.toFixed(2)}</span>
                  </div>
                  <div className="order-actions">
                    {order.status === 'pending' && (
                      <button 
                        className="btn btn-outline btn-sm"
                        onClick={() => handleCancelOrder(order._id)}
                      >
                        Cancel
                      </button>
                    )}
                    <Link to={`/patient/orders/${order._id}`} className="btn btn-primary btn-sm">
                      View Details
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button
                className="btn btn-outline"
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >
                Previous
              </button>
              <span className="page-info">Page {page} of {totalPages}</span>
              <button
                className="btn btn-outline"
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
