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
  const [hasPharmacy, setHasPharmacy] = useState(true);
  const { showNotification } = useNotification();

  const fetchDashboardData = async () => {
    try {
      const [ordersRes, stockRes] = await Promise.all([
        orderAPI.getPharmacyOrders({ limit: 5 }),
        stockAPI.getMyStock()
      ]);

      const orders = ordersRes.data?.data?.orders || [];
      const stock = stockRes.data?.data?.stock || [];

      const totalOrders = orders.length;
      const pendingOrders = orders.filter(o => o.status === 'pending').length;
      const lowStockItems = stock.filter(s => s.quantity < 10).length;
      const revenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);

      setStats({
        totalOrders,
        pendingOrders,
        totalStock: stock.length,
        lowStockItems,
        revenue
      });
      setRecentOrders(orders.slice(0, 5));
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      showNotification('Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const res = await pharmacyAPI.getMyPharmacy();
        const myPharmacy = res.data?.data?.pharmacy || res.data?.pharmacy;
        if (!myPharmacy) {
          setHasPharmacy(false);
          setLoading(false);
          return;
        }
        setHasPharmacy(true);
        await fetchDashboardData();
      } catch (err) {
        // No pharmacy yet
        setHasPharmacy(false);
        setLoading(false);
      }
    };

    init();
  }, []);

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'badge-warning',
      confirmed: 'badge-info',
      processing: 'badge-primary',
      ready: 'badge-success',
      out_for_delivery: 'badge-info',
      delivered: 'badge-success',
      cancelled: 'badge-danger'
    };
    return badges[status] || 'badge-secondary';
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
          <p>Welcome back! Here's what's happening with your store.</p>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon orders" />
            <div className="stat-content">
              <h3>Total Orders</h3>
              <p className="stat-value">{stats.totalOrders}</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon pending" />
            <div className="stat-content">
              <h3>Pending Orders</h3>
              <p className="stat-value">{stats.pendingOrders}</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon stock" />
            <div className="stat-content">
              <h3>Stock Items</h3>
              <p className="stat-value">{stats.totalStock}</p>
              {stats.lowStockItems > 0 && <span className="stat-warning">{stats.lowStockItems} low stock</span>}
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon revenue" />
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
              <Link to="/pharmacy/orders" className="link">View All</Link>
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
                        <td><span className={getStatusBadge(order.status)}>{order.status}</span></td>
                        <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {hasPharmacy ? (
            <div className="dashboard-section quick-actions">
              <h2>Quick Actions</h2>
              <div className="actions-grid">
                <Link to="/pharmacy/stock" className="action-card">Manage Stock</Link>
                <Link to="/pharmacy/orders" className="action-card">View Orders</Link>
                <Link to="/pharmacy/prescriptions" className="action-card">Prescription Requests</Link>
                <Link to="/pharmacy/analytics" className="action-card">Analytics</Link>
              </div>
            </div>
          ) : (
            <div className="dashboard-section">
              <h2>Your pharmacy is not set up yet</h2>
              <p className="empty-text">Create your pharmacy profile to start receiving orders.</p>
              <Link to="/pharmacy/profile" className="btn btn-primary">Create Pharmacy</Link>
            </div>
          )}
        </div>
      </div>
    );
};

export default PharmacyDashboard;
