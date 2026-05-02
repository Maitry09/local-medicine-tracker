import { useState, useEffect } from 'react';
import { orderAPI, pharmacyAPI } from '../../services/api';
import { useNotification } from '../../context/NotificationContext';

const PharmacyAnalytics = () => {
  const [analytics, setAnalytics] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    averageOrderValue: 0,
    topMedicines: [],
    orderTrend: [],
    revenueByStatus: {},
  });
  const [loading, setLoading] = useState(true);
  const { showNotification } = useNotification();

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      console.log('🔄 Fetching analytics data...');
      const [ordersRes, stockRes] = await Promise.all([
        orderAPI.getPharmacyOrders({ limit: 1000 }),
        pharmacyAPI.getMyPharmacyStock(),
      ]);

      console.log('📊 Orders response:', ordersRes.data);
      console.log('📦 Stock response:', stockRes.data);

      const orders = ordersRes.data.orders || [];
      const stocks = stockRes.data.stocks || [];

      // Calculate analytics
      const totalRevenue = orders
        .filter((o) => o.paymentStatus === 'paid')
        .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

      const averageOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;

      // Top medicines by quantity sold
      const medicineMap = {};
      orders.forEach((order) => {
        if (order.items && Array.isArray(order.items)) {
          order.items.forEach((item) => {
            const key = item.medicineId || item.medicine?._id;
            if (key) {
              medicineMap[key] = (medicineMap[key] || 0) + (item.quantity || 0);
            }
          });
        }
      });

      const topMedicines = Object.entries(medicineMap)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([id, qty]) => ({ medicineId: id, quantity: qty }));

      // Revenue by order status
      const revenueByStatus = {};
      orders.forEach((order) => {
        const status = order.status || 'unknown';
        if (!revenueByStatus[status]) {
          revenueByStatus[status] = 0;
        }
        revenueByStatus[status] += order.totalAmount || 0;
      });

      const analyticsData = {
        totalRevenue,
        totalOrders: orders.length,
        averageOrderValue: parseFloat(averageOrderValue.toFixed(2)),
        topMedicines,
        stocks,
        revenueByStatus,
      };

      console.log('✅ Analytics calculated:', analyticsData);
      setAnalytics(analyticsData);
    } catch (error) {
      console.error('❌ Failed to fetch analytics:', error);
      showNotification('Failed to load analytics data', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div style={{ width: '40px', height: '40px', border: '4px solid #f0f0f0', borderTop: '4px solid #1976d2', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 20px' }}></div>
        <p>Loading analytics...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <h1>Pharmacy Analytics</h1>
        <p>Track your pharmacy performance and sales metrics</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div style={{ background: 'white', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '20px' }}>
          <h3>Total Revenue</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: '10px 0' }}>Rs. {analytics.totalRevenue.toFixed(2)}</p>
        </div>

        <div style={{ background: 'white', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '20px' }}>
          <h3>Total Orders</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: '10px 0' }}>{analytics.totalOrders}</p>
        </div>

        <div style={{ background: 'white', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '20px' }}>
          <h3>Average Order Value</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: '10px 0' }}>Rs. {analytics.averageOrderValue.toFixed(2)}</p>
        </div>

        <div style={{ background: 'white', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '20px' }}>
          <h3>Stock Items</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: '10px 0' }}>{analytics.stocks?.length || 0}</p>
        </div>
      </div>

      <div style={{ background: 'white', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '20px', marginBottom: '20px' }}>
        <h2>Revenue by Order Status</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px' }}>
          {Object.entries(analytics.revenueByStatus).map(([status, revenue]) => (
            <div key={status} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 120px', gap: '10px', alignItems: 'center' }}>
              <span style={{ fontWeight: '500' }}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
              <div style={{ background: '#f0f0f0', borderRadius: '4px', height: '8px', overflow: 'hidden' }}>
                <div
                  style={{
                    background: '#1976d2',
                    height: '100%',
                    borderRadius: '4px',
                    width: `${analytics.totalRevenue > 0 ? (revenue / analytics.totalRevenue) * 100 : 0}%`,
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
              <span style={{ textAlign: 'right', fontWeight: '500' }}>Rs. {revenue.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>

      {analytics.topMedicines?.length > 0 && (
        <div style={{ background: 'white', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '20px' }}>
          <h2>Top Selling Medicines</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px' }}>
            {analytics.topMedicines.map((medicine, index) => (
              <div key={index} style={{ display: 'grid', gridTemplateColumns: '50px 1fr 100px', gap: '10px', alignItems: 'center', padding: '10px', background: '#f9f9f9', borderRadius: '6px' }}>
                <span style={{ fontWeight: '600', color: '#1976d2' }}>#{index + 1}</span>
                <span style={{ fontWeight: '500' }}>{medicine.medicineId}</span>
                <span style={{ textAlign: 'right', color: '#666' }}>Qty: {medicine.quantity}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PharmacyAnalytics;
