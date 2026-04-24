import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

export default function PatientDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalOrders: 0,
    activeOrders: 0,
    activeAlerts: 0,
    savedPharmacies: 0
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [ordersRes, alertsRes] = await Promise.all([
        api.get('/orders/my-orders?limit=5'),
        api.get('/alerts/my-alerts')
      ]);

      const orders = ordersRes.data.data.orders || [];
      const alerts = alertsRes.data.data.alerts || [];

      setRecentOrders(orders);
      setStats({
        totalOrders: ordersRes.data.data.total || orders.length,
        activeOrders: orders.filter(o => !['delivered', 'cancelled'].includes(o.status)).length,
        activeAlerts: alerts.filter(a => a.isActive).length,
        savedPharmacies: user?.savedPharmacies?.length || 0
      });
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
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

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="patient-dashboard">
      <div className="dashboard-header">
        <h1>Welcome back, {user?.name?.split(' ')[0] || 'Patient'}!</h1>
        <p>Track your orders and medicine alerts</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon orders-icon">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
          </div>
          <div className="stat-content">
            <h3>Total Orders</h3>
            <p className="stat-value">{stats.totalOrders}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon active-icon">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
            </svg>
          </div>
          <div className="stat-content">
            <h3>Active Orders</h3>
            <p className="stat-value">{stats.activeOrders}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon alerts-icon">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
          </div>
          <div className="stat-content">
            <h3>Active Alerts</h3>
            <p className="stat-value">{stats.activeAlerts}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon pharmacy-icon">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
            </svg>
          </div>
          <div className="stat-content">
            <h3>Saved Pharmacies</h3>
            <p className="stat-value">{stats.savedPharmacies}</p>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card recent-orders">
          <div className="card-header">
            <h2>Recent Orders</h2>
            <Link to="/patient/orders" className="view-all-link">View All</Link>
          </div>
          <div className="card-body">
            {recentOrders.length === 0 ? (
              <div className="empty-state">
                <p>No orders yet</p>
                <Link to="/search" className="btn btn-primary">Search Medicines</Link>
              </div>
            ) : (
              <div className="orders-list">
                {recentOrders.map(order => (
                  <Link to={`/patient/orders/${order._id}`} key={order._id} className="order-item">
                    <div className="order-info">
                      <span className="order-id">#{order.orderNumber}</span>
                      <span className="order-date">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="order-details">
                      <span className="order-items">{order.items?.length || 0} items</span>
                      <span className="order-total">₹{order.totalAmount?.toFixed(2)}</span>
                    </div>
                    <span className={`status-badge ${getStatusColor(order.status)}`}>
                      {order.status?.replace(/_/g, ' ')}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="dashboard-card quick-actions">
          <div className="card-header">
            <h2>Quick Actions</h2>
          </div>
          <div className="card-body">
            <div className="actions-grid">
              <Link to="/search" className="action-btn">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <span>Search Medicine</span>
              </Link>
              <Link to="/pharmacies" className="action-btn">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
                <span>Nearby Pharmacies</span>
              </Link>
              <Link to="/patient/alerts" className="action-btn">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                </svg>
                <span>My Alerts</span>
              </Link>
              <Link to="/patient/cart" className="action-btn">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121 0 2.09-.77 2.348-1.863l1.784-7.5H5.25l-.384 1.44M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                </svg>
                <span>View Cart</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
