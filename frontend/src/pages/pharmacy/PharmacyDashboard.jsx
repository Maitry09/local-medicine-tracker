import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { pharmacyAPI, orderAPI, stockAPI } from '../../services/api';
import { useNotification } from '../../context/NotificationContext';

const PharmacyDashboard = () => {
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    totalStock: 0,
    lowStockItems: 0,
    revenue: 0,
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showNotification } = useNotification();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [ordersRes, stockRes] = await Promise.all([
        orderAPI.getPharmacyOrders({ limit: 5 }),
        stockAPI.getStocks(),
      ]);

      const orders = ordersRes.data?.data?.orders || ordersRes.data?.orders || [];
      const stock = stockRes.data?.data?.stock || stockRes.data?.data?.stocks || [];

      setRecentOrders(orders);
      setStats({
        totalOrders: ordersRes.data.total || orders.length,
        pendingOrders: orders.filter((o) => o.status === 'pending').length,
        totalStock: stock.length,
        lowStockItems: stock.filter((s) => Number(s.quantity ?? 0) <= Number(s.lowStockThreshold ?? 0)).length,
        revenue: orders
          .filter((o) => o.paymentStatus === 'paid')
          .reduce((sum, o) => sum + Number(o.totalAmount ?? o.total ?? 0), 0),
      });
    } catch (error) {
      showNotification('Failed to fetch dashboard data', 'error');
    } finally {
      setLoading(false);
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

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <h1>Pharmacy Dashboard</h1>
        <p>Welcome back! Here&apos;s what&apos;s happening with your store.</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon orders">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            </svg>
          </div>
          <div className="stat-content">
            <h3>Total Orders</h3>
            <p className="stat-value">{stats.totalOrders}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon pending">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div className="stat-content">
            <h3>Pending Orders</h3>
            <p className="stat-value">{stats.pendingOrders}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stock">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <div className="stat-content">
            <h3>Stock Items</h3>
            <p className="stat-value">{stats.totalStock}</p>
            {stats.lowStockItems > 0 && (
              <span className="stat-warning">{stats.lowStockItems} low stock</span>
            )}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon revenue">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <div className="stat-content">
            <h3>Revenue</h3>
            <p className="stat-value">Rs. {(Number(stats.revenue) || 0).toFixed(2)}</p>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-section">
          <div className="section-header">
            <h2>Recent Orders</h2>
            <Link to="/pharmacy/orders" className="link">
              View All
            </Link>
          </div>
          {recentOrders.length === 0 ? (
            <p className="empty-text">No orders yet</p>
          ) : (
            <div className="orders-table">
              <table>
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => (
                    <tr key={order._id}>
                      <td>#{order._id.slice(-8).toUpperCase()}</td>
                      <td>{order.user?.name || order.customer?.name || '-'}</td>
                      <td>Rs. {Number(order.totalAmount ?? order.total ?? 0).toFixed(2)}</td>
                      <td>
                        <span className={getStatusBadge(order.status)}>{order.status}</span>
                      </td>
                      <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="dashboard-section quick-actions">
          <h2>Quick Actions</h2>
          <div className="actions-grid">
            <Link to="/pharmacy/stock" className="action-card">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="12" y1="8" x2="12" y2="16" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
              <span>Manage Stock</span>
            </Link>
            <Link to="/pharmacy/orders" className="action-card">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
              <span>View Orders</span>
            </Link>
            <Link to="/pharmacy/profile" className="action-card">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <span>Store Profile</span>
            </Link>
            <Link to="/pharmacy/analytics" className="action-card">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
              <span>Analytics</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PharmacyDashboard;
