import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { medicineAPI } from '../services/api';

export default function MedicineCompare() {
  const { id } = useParams();
  const [medicine, setMedicine] = useState(null);
  const [availability, setAvailability] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortField, setSortField] = useState('finalPrice');
  const [sortDir, setSortDir] = useState('asc');
  const [filterInStock, setFilterInStock] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [medRes, availRes] = await Promise.all([
          medicineAPI.getById(id),
          medicineAPI.getAvailability(id, { limit: 50 })
        ]);
        setMedicine(medRes.data.data.medicine);
        setAvailability(availRes.data.data.availability || []);
      } catch {
        setError('Failed to load comparison data');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id]);

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <span style={{ color: '#ccc', marginLeft: 4 }}>↕</span>;
    return <span style={{ marginLeft: 4 }}>{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  const filtered = availability
    .filter(a => !filterInStock || a.quantity > 0)
    .map(a => ({
      ...a,
      finalPrice: a.price * (1 - (a.discount || 0) / 100)
    }))
    .sort((a, b) => {
      let va = a[sortField], vb = b[sortField];
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

  const cheapest = filtered.length > 0 ? Math.min(...filtered.map(a => a.finalPrice)) : null;

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}><div className="spinner" /></div>;
  if (error) return <div className="container" style={{ padding: '2rem' }}><div className="alert alert-danger">{error}</div></div>;

  return (
    <div className="container" style={{ padding: '2rem 1rem' }}>
      <Link to={`/medicines/${id}`} className="text-primary" style={{ fontSize: 14 }}>← Back to Medicine</Link>

      {medicine && (
        <div style={{ margin: '1rem 0 1.5rem' }}>
          <h1 style={{ marginBottom: 4 }}>{medicine.name}</h1>
          <p className="text-muted">{medicine.genericName} · {medicine.dosageForm} {medicine.strength} · MRP Rs. {medicine.mrp}</p>
        </div>
      )}

      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
          <input type="checkbox" checked={filterInStock} onChange={e => setFilterInStock(e.target.checked)} />
          <span>Show in-stock only</span>
        </label>
        <span className="text-muted" style={{ marginLeft: 'auto', fontSize: 14 }}>
          {filtered.length} pharmacies · Click column headers to sort
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🏪</div>
          <h3>No pharmacies available</h3>
          <p>{filterInStock ? 'Try unchecking "in-stock only" to see all pharmacies.' : 'No pharmacies carry this medicine yet.'}</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#f5f5f5' }}>
                {[
                  { key: 'pharmacy.name', label: 'Pharmacy' },
                  { key: 'pharmacy.address.city', label: 'City' },
                  { key: 'price', label: 'MRP Price' },
                  { key: 'discount', label: 'Discount' },
                  { key: 'finalPrice', label: 'You Pay' },
                  { key: 'quantity', label: 'Stock' },
                ].map(col => (
                  <th key={col.key}
                    onClick={() => handleSort(col.key)}
                    style={{ padding: '12px 16px', textAlign: 'left', cursor: 'pointer', userSelect: 'none',
                      borderBottom: '2px solid #e0e0e0', whiteSpace: 'nowrap' }}>
                    {col.label}<SortIcon field={col.key} />
                  </th>
                ))}
                <th style={{ padding: '12px 16px', borderBottom: '2px solid #e0e0e0' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a, i) => {
                const isCheapest = a.finalPrice === cheapest && a.quantity > 0;
                return (
                  <tr key={a._id || i}
                    style={{ background: isCheapest ? '#f0fdf4' : i % 2 === 0 ? 'white' : '#fafafa',
                      borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '12px 16px', fontWeight: isCheapest ? 700 : 400 }}>
                      {isCheapest && <span title="Cheapest available" style={{ marginRight: 4 }}>🏆</span>}
                      {a.pharmacy?.name || '—'}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#666' }}>
                      {a.pharmacy?.address?.city || '—'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>Rs. {a.price}</td>
                    <td style={{ padding: '12px 16px', color: a.discount > 0 ? '#2e7d32' : '#999' }}>
                      {a.discount > 0 ? `${a.discount}%` : '—'}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, fontSize: 16, color: isCheapest ? '#2e7d32' : '#1976d2' }}>
                      Rs. {a.finalPrice.toFixed(0)}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {a.quantity > 0
                        ? <span style={{ color: '#2e7d32' }}>✅ {a.quantity} units</span>
                        : <span style={{ color: '#c62828' }}>❌ Out of stock</span>
                      }
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {a.quantity > 0 && a.pharmacy?._id && (
                        <Link to={`/pharmacies/${a.pharmacy._id}`} className="btn btn-sm btn-outline" style={{ fontSize: 12 }}>
                          View Pharmacy →
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {cheapest && (
        <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: '#f0fdf4', borderRadius: 8, border: '1px solid #c3e6cb' }}>
          🏆 <strong>Best price: Rs. {cheapest.toFixed(0)}</strong>
          {medicine && cheapest < medicine.mrp && (
            <span style={{ marginLeft: 8, color: '#2e7d32' }}>
              (Rs. {(medicine.mrp - cheapest).toFixed(0)} savings vs MRP)
            </span>
          )}
        </div>
      )}
    </div>
  );
}
