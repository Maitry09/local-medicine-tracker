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
      console.log('🔄 Fetching patient dashboard data...');
      const [ordersRes, alertsRes] = await Promise.all([
        api.get('/orders/my-orders?limit=5'),
        api.get('/alerts/my-alerts')
      ]);

      console.log('📊 Orders response:', ordersRes.data);
      console.log('🔔 Alerts response:', alertsRes.data);

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
      console.error('❌ Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px' }}>
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <div style={{ width: '40px', height: '40px', border: '4px solid #f0f0f0', borderTop: '4px solid #1976d2', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 20px' }}></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <h1>Welcome back, {user?.name?.split(' ')[0] || 'Patient'}!</h1>
        <p>Track your orders and medicine alerts</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div style={{ background: 'white', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '20px' }}>
          <h3>Total Orders</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: '10px 0' }}>{stats.totalOrders}</p>
        </div>

        <div style={{ background: 'white', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '20px' }}>
          <h3>Active Orders</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: '10px 0' }}>{stats.activeOrders}</p>
        </div>

        <div style={{ background: 'white', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '20px' }}>
          <h3>Active Alerts</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: '10px 0' }}>{stats.activeAlerts}</p>
        </div>
      </div>

      <div>
        <h2>Recent Orders</h2>
        {recentOrders.length === 0 ? (
          <p>No recent orders</p>
        ) : (
          <div style={{ display: 'grid', gap: '10px' }}>
            {recentOrders.map((order) => (
              <div key={order._id} style={{ background: 'white', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '15px' }}>
                <p><strong>Order ID:</strong> {order._id}</p>
                <p><strong>Status:</strong> {order.status}</p>
                <p><strong>Total:</strong> Rs. {order.totalAmount}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
