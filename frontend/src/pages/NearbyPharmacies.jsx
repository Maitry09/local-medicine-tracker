import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../services/api';

const KM_OPTIONS = [1, 2, 5, 10, 20];

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function NearbyPharmacies() {
  const [searchParams] = useSearchParams();
  const medicineId = searchParams.get('medicine');

  const [pharmacies, setPharmacies] = useState([]);
  const [location, setLocation] = useState(null);
  const [geoError, setGeoError] = useState('');
  const [loading, setLoading] = useState(false);
  const [radius, setRadius] = useState(5);
  const [sortBy, setSortBy] = useState('distance'); // 'distance' | 'price'

  const fetchNearby = useCallback(async (lat, lng, km) => {
    setLoading(true);
    try {
      const params = { lat, lng, radius: km };
      if (medicineId) params.medicine = medicineId;
      const res = await api.get('/pharmacies/nearby', { params });
      const list = res.data.data.pharmacies || [];
      // Attach distance
      setPharmacies(list.map(p => ({
        ...p,
        distanceKm: haversineKm(lat, lng, p.address.coordinates.lat, p.address.coordinates.lng).toFixed(1)
      })));
    } catch { setPharmacies([]); }
    finally { setLoading(false); }
  }, [medicineId]);

  const getLocation = () => {
    setGeoError('');
    if (!navigator.geolocation) { setGeoError('Geolocation not supported by your browser'); return; }
    navigator.geolocation.getCurrentPosition(
      pos => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLocation(coords);
        fetchNearby(coords.lat, coords.lng, radius);
      },
      () => setGeoError('Location access denied. Please enable location in your browser.')
    );
  };

  useEffect(() => { getLocation(); }, []); // auto-request on mount

  const sorted = [...pharmacies].sort((a, b) => {
    if (sortBy === 'distance') return parseFloat(a.distanceKm) - parseFloat(b.distanceKm);
    if (sortBy === 'price') {
      const pa = a.stockInfo?.price ?? Infinity;
      const pb = b.stockInfo?.price ?? Infinity;
      return pa - pb;
    }
    return 0;
  });

  return (
    <div className="container" style={{ padding: '2rem 1rem' }}>
      <h1>Pharmacies Near You</h1>
      {medicineId && <p className="text-muted">Showing pharmacies that have your medicine in stock</p>}

      {/* Controls */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', margin: '1.5rem 0', alignItems: 'center' }}>
        <div>
          <label className="form-label" style={{ fontSize: 13 }}>Radius</label>
          <select className="form-select" value={radius} onChange={e => {
            const km = parseInt(e.target.value);
            setRadius(km);
            if (location) fetchNearby(location.lat, location.lng, km);
          }}>
            {KM_OPTIONS.map(k => <option key={k} value={k}>{k} km</option>)}
          </select>
        </div>
        <div>
          <label className="form-label" style={{ fontSize: 13 }}>Sort by</label>
          <select className="form-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="distance">Distance</option>
            {medicineId && <option value="price">Price (lowest first)</option>}
          </select>
        </div>
        <button className="btn btn-outline" onClick={getLocation} style={{ marginTop: 'auto' }}>
          📍 Refresh Location
        </button>
      </div>

      {geoError && (
        <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>
          {geoError}
        </div>
      )}

      {!location && !geoError && (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: 64 }}>📍</div>
          <p>Allow location access to find nearby pharmacies</p>
          <button className="btn btn-primary" onClick={getLocation}>Enable Location</button>
        </div>
      )}

      {loading && <div style={{ textAlign: 'center', padding: '2rem' }}><div className="spinner" /></div>}

      {!loading && location && pharmacies.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">🏪</div>
          <h3>No pharmacies found within {radius} km</h3>
          <p>Try increasing the radius</p>
        </div>
      )}

      <div style={{ display: 'grid', gap: '1rem' }}>
        {sorted.map(p => (
          <Link key={p._id} to={`/pharmacies/${p._id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="card" style={{ transition: 'box-shadow 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = ''}>
              <div className="card-body">
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <h3 style={{ margin: 0 }}>{p.name}</h3>
                    <p style={{ fontSize: 14, color: '#666', margin: '4px 0' }}>
                      {p.address.street}, {p.address.city} · {p.phone}
                    </p>
                    <p style={{ fontSize: 13, color: '#999', margin: 0 }}>
                      Open: {p.operatingHours?.open} – {p.operatingHours?.close}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: '#1976d2' }}>📍 {p.distanceKm} km</div>
                    {p.stockInfo && (
                      <div style={{ marginTop: 4 }}>
                        <span style={{ fontSize: 18, fontWeight: 700, color: '#2e7d32' }}>
                          Rs. {(p.stockInfo.price * (1 - p.stockInfo.discount / 100)).toFixed(0)}
                        </span>
                        {p.stockInfo.discount > 0 && (
                          <span style={{ fontSize: 12, color: '#999', marginLeft: 4 }}>
                            <s>Rs. {p.stockInfo.price}</s> ({p.stockInfo.discount}% off)
                          </span>
                        )}
                        <div style={{ fontSize: 12, color: '#2e7d32' }}>✅ In Stock ({p.stockInfo.quantity} units)</div>
                      </div>
                    )}
                    {medicineId && !p.stockInfo && (
                      <div style={{ fontSize: 12, color: '#c62828', marginTop: 4 }}>❌ Out of Stock</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
