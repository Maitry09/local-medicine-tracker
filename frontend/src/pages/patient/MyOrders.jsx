import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

export default function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filter, setFilter] = useState('all');

  const [page, setPage] = useState(1);

  const ITEMS_PER_PAGE = 5;

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);

      const response = await api.get('/orders/my-orders');
      const backendOrders = response.data?.data?.orders || [];

      if (backendOrders.length > 0) {
        setOrders(backendOrders);
      } else {
        const localOrders = JSON.parse(localStorage.getItem('orders')) || [];
        setOrders(localOrders);
      }
    } catch (err) {
      console.error(err);
      const localOrders = JSON.parse(localStorage.getItem('orders')) || [];
      setOrders(localOrders);
    } finally {
      setLoading(false);
    }
  };

  // FILTER ORDERS
  const filteredOrders = useMemo(() => {
    if (filter === 'all') return orders;

    return orders.filter(
      (order) => order.status === filter
    );
  }, [orders, filter]);

  // PAGINATION
  const totalPages = Math.ceil(
    filteredOrders.length / ITEMS_PER_PAGE
  );

  const paginatedOrders = filteredOrders.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

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

  const getOrderTotal = (order) => {
    if (order?.total != null) return order.total;
    return (order?.subtotal || 0) - (order?.discount || 0) + (order?.deliveryCharge || 0) + (order?.tax || 0);
  };

  const handleCancelOrder = async (orderId) => {
    if (
      !window.confirm(
        'Are you sure you want to cancel this order?'
      )
    )
      return;

    try {
      await api.patch(`/orders/${orderId}/cancel`);

      fetchOrders();
    } catch (error) {
      alert(
        error.response?.data?.message ||
          'Failed to cancel order'
      );
    }
  };

  const statusFilters = [
    { value: 'all', label: 'All Orders' },
    { value: 'pending', label: 'Pending' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'processing', label: 'Processing' },
    { value: 'ready', label: 'Ready' },
    {
      value: 'out_for_delivery',
      label: 'Out for Delivery'
    },
    { value: 'delivered', label: 'Delivered' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  if (loading) {
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

        <p>
          Track and manage your medicine
          orders
        </p>
      </div>

      {/* FILTERS */}
      <div className="filters-bar">
        <div className="filter-tabs">
          {statusFilters.map((f) => (
            <button
              key={f.value}
              className={`filter-tab ${
                filter === f.value ? 'active' : ''
              }`}
              onClick={() => {
                setFilter(f.value);
                setPage(1);
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* EMPTY */}
      {filteredOrders.length === 0 ? (
        <div className="empty-state">
          <h3>No orders found</h3>

          <p>
            No orders available for selected
            filter.
          </p>

          <Link
            to="/search"
            className="btn btn-primary"
          >
            Search Medicines
          </Link>
        </div>
      ) : (
        <>
          <div className="orders-list">
            {paginatedOrders.map((order, index) => (
              <div
                  key={order._id || order.id || `${order.orderNumber || 'order'}-${index}`}
                className="order-card"
              >
                {/* HEADER */}
                <div className="order-header">
                  <div className="order-meta">
                    <span className="order-number">
                      Order #
                      {order.orderNumber || order._id}
                    </span>

                    <span className="order-date">
                      {new Date(
                        order.createdAt
                      ).toLocaleDateString(
                        'en-IN',
                        {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }
                      )}
                    </span>
                  </div>

                  <span
                    className={`status-badge ${getStatusColor(
                      order.status
                    )}`}
                  >
                    {order.status?.replace(
                      /_/g,
                      ' '
                    )}
                  </span>
                </div>

                {/* BODY */}
                <div className="order-body">
                  <div className="pharmacy-info">
                    <span>
                      {order.pharmacy?.name ||
                        order.pharmacyName ||
                        'Pharmacy'}
                    </span>
                  </div>

                  <div className="order-items-preview">
                    {order.items
                      ?.slice(0, 3)
                      .map((item, index) => (
                        <span
                          key={`${item._id || item.medicineId}-${index}`}
                          className="item-name"
                        >
                          {item.medicine?.name ||
                            'Medicine'}
                          {' x'}
                          {item.quantity}
                        </span>
                      ))}

                    {order.items?.length > 3 && (
                      <span className="more-items">
                        +
                        {order.items.length - 3}{' '}
                        more
                      </span>
                    )}
                  </div>
                </div>

                {/* FOOTER */}
                <div className="order-footer">
                  <div className="order-total">
                    <span className="label">Total:</span>
                    <span className="amount">
                      ₹{(order.total || 0).toFixed(2)}
                    </span>
                  </div>

                  <div className="order-actions">
                    {order.status ===
                      'pending' && (
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() =>
                          handleCancelOrder(
                            order._id
                          )
                        }
                      >
                        Cancel
                      </button>
                    )}

                    <Link
                      to={`/orders/${order._id}`}
                      className="btn btn-primary btn-sm"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* PAGINATION */}
          {totalPages > 1 && (
            <div className="pagination">
              <button
                className="btn btn-outline"
                disabled={page === 1}
                onClick={() =>
                  setPage((p) => p - 1)
                }
              >
                Previous
              </button>

              <span className="page-info">
                Page {page} of {totalPages}
              </span>

              <button
                className="btn btn-outline"
                disabled={page === totalPages}
                onClick={() =>
                  setPage((p) => p + 1)
                }
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