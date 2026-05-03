import { useState, useEffect, useMemo } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { orderAPI, stockAPI } from '../../services/api';

const COLORS = ['#1976d2', '#2e7d32', '#f57c00', '#c62828', '#7b1fa2', '#00796b'];

function StatCard({ title, value, sub, color = '#1976d2', icon }) {
  return (
    <div className="card" style={{ flex: '1 1 180px' }}>
      <div className="card-body" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 32 }}>{icon}</div>
        <div style={{ fontSize: 28, fontWeight: 700, color, margin: '8px 0 4px' }}>{value}</div>
        <div style={{ fontWeight: 600, color: '#333' }}>{title}</div>
        {sub && <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}

export default function PharmacyAnalytics() {
  const [orders, setOrders] = useState([]);
  const [stock, setStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(30); // days

  useEffect(() => {
    (async () => {
      try {
        const [ordersRes, stockRes] = await Promise.all([
          orderAPI.getPharmacyOrders({ limit: 1000 }),
          stockAPI.getMyStock({ limit: 500 })
        ]);
        setOrders(ordersRes.data.data?.orders || []);
        setStock(stockRes.data.data?.stock || []);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  const analytics = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - period);

    const periodOrders = orders.filter(o => new Date(o.createdAt) >= cutoff);
    const paidOrders = periodOrders.filter(o => o.paymentStatus === 'paid');
    const totalRevenue = paidOrders.reduce((s, o) => s + (o.totalAmount || o.total || 0), 0);
    const avgOrderValue = paidOrders.length ? totalRevenue / paidOrders.length : 0;

    // Revenue by day
    const revenueByDay = {};
    paidOrders.forEach(o => {
      const day = new Date(o.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
      revenueByDay[day] = (revenueByDay[day] || 0) + (o.totalAmount || o.total || 0);
    });
    const revenueTrend = Object.entries(revenueByDay)
      .map(([date, revenue]) => ({ date, revenue: Math.round(revenue) }))
      .slice(-14);

    // Order status breakdown
    const statusCount = {};
    periodOrders.forEach(o => { statusCount[o.status] = (statusCount[o.status] || 0) + 1; });
    const statusData = Object.entries(statusCount).map(([name, value]) => ({ name, value }));

    // Top medicines
    const medicineRevenue = {};
    paidOrders.forEach(o => {
      (o.items || []).forEach(item => {
        const name = item.medicine?.name || 'Unknown';
        if (!medicineRevenue[name]) medicineRevenue[name] = { name, revenue: 0, units: 0 };
        medicineRevenue[name].revenue += (item.price || 0) * (item.quantity || 1);
        medicineRevenue[name].units += item.quantity || 1;
      });
    });
    const topMedicines = Object.values(medicineRevenue)
      .sort((a, b) => b.revenue - a.revenue).slice(0, 8);

    // Low stock (< 10 units)
    const now = new Date();
    const lowStock = stock.filter(s => s.quantity > 0 && s.quantity < 10);
    const expiringSoon = stock.filter(s => {
      if (!s.expiryDate) return false;
      const daysLeft = (new Date(s.expiryDate) - now) / (1000 * 60 * 60 * 24);
      return daysLeft <= 30 && daysLeft > 0;
    });
    const outOfStock = stock.filter(s => s.quantity === 0);

    return { totalRevenue, avgOrderValue, paidOrders, periodOrders, revenueTrend, statusData, topMedicines, lowStock, expiringSoon, outOfStock };
  }, [orders, stock, period]);

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}><div className="spinner" /></div>;

  return (
    <div style={{ padding: '1.5rem' }}>
      {/* Header + Period Selector */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0 }}>Analytics Dashboard</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {[7, 30, 90].map(d => (
            <button key={d} onClick={() => setPeriod(d)}
              className={`btn btn-sm ${period === d ? 'btn-primary' : 'btn-outline'}`}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <StatCard icon="💰" title="Revenue" value={`₹${analytics.totalRevenue.toLocaleString('en-IN')}`} sub={`last ${period} days`} color="#1976d2" />
        <StatCard icon="📦" title="Total Orders" value={analytics.periodOrders.length} sub={`${analytics.paidOrders.length} paid`} color="#2e7d32" />
        <StatCard icon="🧾" title="Avg Order Value" value={`₹${analytics.avgOrderValue.toFixed(0)}`} color="#f57c00" />
        <StatCard icon="⚠️" title="Low Stock Items" value={analytics.lowStock.length} sub="< 10 units" color="#c62828" />
        <StatCard icon="📅" title="Expiring ≤30d" value={analytics.expiringSoon.length} sub="items" color="#7b1fa2" />
        <StatCard icon="❌" title="Out of Stock" value={analytics.outOfStock.length} sub="items" color="#999" />
      </div>

      {/* Revenue Trend */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-body">
          <h3 style={{ marginBottom: '1rem' }}>Revenue Trend</h3>
          {analytics.revenueTrend.length === 0 ? (
            <p className="text-muted">No paid orders in this period.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={analytics.revenueTrend} margin={{ left: 10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${v}`} />
                <Tooltip formatter={v => [`₹${v}`, 'Revenue']} />
                <Line type="monotone" dataKey="revenue" stroke="#1976d2" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Top Medicines */}
        <div className="card">
          <div className="card-body">
            <h3 style={{ marginBottom: '1rem' }}>Top Medicines by Revenue</h3>
            {analytics.topMedicines.length === 0 ? (
              <p className="text-muted">No data.</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={analytics.topMedicines} layout="vertical" margin={{ left: 60, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={v => `₹${v}`} tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={60} />
                  <Tooltip formatter={v => [`₹${v}`, 'Revenue']} />
                  <Bar dataKey="revenue" fill="#1976d2" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Order Status Pie */}
        <div className="card">
          <div className="card-body">
            <h3 style={{ marginBottom: '1rem' }}>Order Status Breakdown</h3>
            {analytics.statusData.length === 0 ? (
              <p className="text-muted">No orders in this period.</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={analytics.statusData} dataKey="value" nameKey="name"
                    cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}>
                    {analytics.statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Low Stock & Expiry Warning Tables */}
      {(analytics.lowStock.length > 0 || analytics.expiringSoon.length > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
          {analytics.lowStock.length > 0 && (
            <div className="card" style={{ border: '1px solid #ffcdd2' }}>
              <div className="card-body">
                <h3 style={{ color: '#c62828', marginBottom: '1rem' }}>⚠️ Low Stock Warning</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#fff8f8' }}>
                      <th style={{ padding: '8px', textAlign: 'left' }}>Medicine</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>Units Left</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.lowStock.slice(0, 10).map((s, i) => (
                      <tr key={i} style={{ borderTop: '1px solid #f5f5f5' }}>
                        <td style={{ padding: '8px' }}>{s.medicine?.name || 'Unknown'}</td>
                        <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700, color: s.quantity <= 5 ? '#c62828' : '#f57c00' }}>
                          {s.quantity}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {analytics.expiringSoon.length > 0 && (
            <div className="card" style={{ border: '1px solid #ffe0b2' }}>
              <div className="card-body">
                <h3 style={{ color: '#e65100', marginBottom: '1rem' }}>📅 Expiring Within 30 Days</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#fffde7' }}>
                      <th style={{ padding: '8px', textAlign: 'left' }}>Medicine</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>Expiry</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>Units</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.expiringSoon.slice(0, 10).map((s, i) => (
                      <tr key={i} style={{ borderTop: '1px solid #f5f5f5' }}>
                        <td style={{ padding: '8px' }}>{s.medicine?.name || 'Unknown'}</td>
                        <td style={{ padding: '8px', textAlign: 'right', color: '#e65100' }}>
                          {new Date(s.expiryDate).toLocaleDateString('en-IN')}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>{s.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
