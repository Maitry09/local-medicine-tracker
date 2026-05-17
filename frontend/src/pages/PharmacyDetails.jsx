import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { pharmacyAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useNotification } from '../context/NotificationContext';

const PharmacyDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const { success } = useNotification();
  
  const [pharmacy, setPharmacy] = useState(null);
  const [stock, setStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  useEffect(() => {
    fetchPharmacyDetails();
  }, [id]);

  const fetchPharmacyDetails = async () => {
    setLoading(true);
    try {
      const [pharmacyRes, stockRes] = await Promise.all([
        pharmacyAPI.getById(id),
        pharmacyAPI.getStock(id, { inStock: 'true', limit: 100 })
      ]);
      setPharmacy(pharmacyRes.data.data.pharmacy);
      setStock(stockRes.data.data.stock);
    } catch (error) {
      console.error('Failed to fetch pharmacy:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (stockItem) => {
    if (!user) {
      navigate('/login');
      return;
    }

    const pharmacyId = pharmacy?._id;
    const pharmacyName = pharmacy?.name || 'Pharmacy';
    const basePrice = Number(stockItem.price || 0);
    const discount = Number(stockItem.discount || 0);
    const displayPrice = Number((basePrice * (1 - discount / 100)).toFixed(2));

    const added = addToCart({
      _id: `${stockItem.medicine._id}-${pharmacyId}`,
      medicineId: stockItem.medicine._id,
      pharmacyId,
      pharmacyName,
      name: stockItem.medicine.name,
      image: stockItem.medicine.image,
      quantity: 1,
      price: displayPrice,
      pharmacyPrice: displayPrice,
      discount,
      selectedStore: pharmacyName,
      stock: stockItem.quantity
    });

    if (added) {
      success(`${stockItem.medicine.name} added to cart`);
    }
  };

  const filteredStock = stock.filter(item => {
    const matchesSearch = !searchQuery || 
      item.medicine.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.medicine.genericName && item.medicine.genericName.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = !selectedCategory || item.medicine.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = [...new Set(stock.map(item => item.medicine.category))];

  const isOpen = () => {
    if (!pharmacy) return false;
    if (pharmacy.operatingHours.is24Hours) return true;
    
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [openHour, openMin] = pharmacy.operatingHours.open.split(':').map(Number);
    const [closeHour, closeMin] = pharmacy.operatingHours.close.split(':').map(Number);
    
    const openTime = openHour * 60 + openMin;
    const closeTime = closeHour * 60 + closeMin;
    
    return currentTime >= openTime && currentTime <= closeTime;
  };

  if (loading) {
    return (
      <div className="container" style={{ padding: '4rem 1rem', textAlign: 'center' }}>
        <div className="spinner"></div>
        <p className="mt-3 text-muted">Loading pharmacy details...</p>
      </div>
    );
  }

  if (!pharmacy) {
    return (
      <div className="container" style={{ padding: '4rem 1rem' }}>
        <div className="empty-state">
          <h3>Pharmacy not found</h3>
          <Link to="/pharmacies" className="btn btn-primary mt-3">Back to Pharmacies</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '2rem 1rem' }}>
      {/* Pharmacy Info */}
      <div className="card mb-4">
        <div className="card-body" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '2rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <h1 style={{ marginBottom: 0 }}>{pharmacy.name}</h1>
                {pharmacy.status === 'approved' && (
                  <span className="badge badge-success">Verified</span>
                )}
              </div>
              
              <p className="text-muted" style={{ marginBottom: '0.5rem' }}>
                {pharmacy.address.street}, {pharmacy.address.city}, {pharmacy.address.state} - {pharmacy.address.pincode}
              </p>
              
              <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                <div>
                  <p className="text-sm text-muted">Phone</p>
                  <p className="font-bold">{pharmacy.phone}</p>
                </div>
                <div>
                  <p className="text-sm text-muted">Email</p>
                  <p className="font-bold">{pharmacy.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted">Hours</p>
                  <p className="font-bold">
                    {pharmacy.operatingHours.is24Hours 
                      ? '24 Hours' 
                      : `${pharmacy.operatingHours.open} - ${pharmacy.operatingHours.close}`}
                  </p>
                </div>
              </div>
            </div>
            
            <div style={{ textAlign: 'right' }}>
              <div className={`pharmacy-status`} style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>
                <span className={`status-dot ${isOpen() ? 'open' : 'closed'}`}></span>
                {isOpen() ? 'Open Now' : 'Closed'}
              </div>
              {pharmacy.rating > 0 && (
                <div>
                  <span style={{ color: '#ffc107', fontSize: '1.25rem' }}>★</span>
                  <span className="font-bold" style={{ fontSize: '1.25rem' }}> {pharmacy.rating.toFixed(1)}</span>
                  <p className="text-muted text-sm">{pharmacy.totalRatings} reviews</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stock Search */}
      <div className="card mb-4">
        <div className="card-body">
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 300px' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Search medicines in this pharmacy..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div style={{ flex: '0 1 200px' }}>
              <select
                className="form-select"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Stock List */}
      <h2 className="mb-3">Available Medicines ({filteredStock.length})</h2>
      
      {filteredStock.length > 0 ? (
        <div className="grid grid-3">
          {filteredStock.map((item) => (
            <div key={item._id} className="card">
              <div className="card-body">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span className="badge badge-primary">{item.medicine.category}</span>
                  {item.quantity < 10 && (
                    <span className="badge badge-warning">Low Stock</span>
                  )}
                </div>
                
                <Link to={`/medicines/${item.medicine._id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <h4 className="medicine-name">{item.medicine.name}</h4>
                </Link>
                {item.medicine.genericName && (
                  <p className="medicine-generic">{item.medicine.genericName}</p>
                )}
                <p className="text-sm text-muted mb-2">{item.medicine.manufacturer}</p>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                  <div>
                    <span className="medicine-price">
                      Rs. {(item.price - (item.price * (item.discount || 0) / 100)).toFixed(2)}
                    </span>
                    {item.discount > 0 && (
                      <span className="medicine-mrp">Rs. {item.price}</span>
                    )}
                  </div>
                  <button 
                    className="btn btn-primary btn-sm"
                    onClick={() => handleAddToCart(item)}
                  >
                    Add
                  </button>
                </div>
                
                <p className="text-xs text-muted mt-2">
                  {item.quantity} units available
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card">
          <div className="card-body text-center" style={{ padding: '3rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💊</div>
            <h3>No medicines found</h3>
            <p className="text-muted">Try adjusting your search or filters</p>
          </div>
        </div>
      )}

      {/* Back Button */}
      <div style={{ marginTop: '2rem' }}>
        <Link to="/pharmacies" className="btn btn-outline">
          &larr; Back to Pharmacies
        </Link>
      </div>
    </div>
  );
};

export default PharmacyDetails;
