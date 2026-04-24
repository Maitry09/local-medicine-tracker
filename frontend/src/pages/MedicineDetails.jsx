import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { medicineAPI, alertAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useNotification } from '../context/NotificationContext';

const MedicineDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addItem } = useCart();
  const { success, error } = useNotification();
  
  const [medicine, setMedicine] = useState(null);
  const [availability, setAvailability] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);

  useEffect(() => {
    // Try to get user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        () => {
          // Default to a location if permission denied
          setUserLocation({ lat: 28.6139, lng: 77.209 }); // Delhi
        }
      );
    }
  }, []);

  useEffect(() => {
    if (userLocation) {
      fetchMedicineDetails();
    }
  }, [id, userLocation]);

  const fetchMedicineDetails = async () => {
    setLoading(true);
    try {
      const response = await medicineAPI.getAvailability(id, {
        lat: userLocation?.lat,
        lng: userLocation?.lng,
        radius: 20
      });
      setMedicine(response.data.data.medicine);
      setAvailability(response.data.data.availability);
    } catch (err) {
      error('Failed to fetch medicine details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (stock) => {
    if (!user) {
      navigate('/login');
      return;
    }

    const added = addItem(
      {
        medicineId: medicine._id,
        medicineName: medicine.name,
        genericName: medicine.genericName,
        price: stock.price,
        discount: stock.discount || 0,
        quantity: 1,
        stockId: stock._id
      },
      stock.pharmacy
    );

    if (added) {
      success(`${medicine.name} added to cart`);
    }
  };

  const handleCreateAlert = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      await alertAPI.create({
        medicineId: medicine._id,
        type: 'availability'
      });
      success('Alert created! We will notify you when this medicine is available.');
    } catch (err) {
      error(err.response?.data?.message || 'Failed to create alert');
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ padding: '4rem 1rem', textAlign: 'center' }}>
        <div className="spinner"></div>
        <p className="mt-3 text-muted">Loading medicine details...</p>
      </div>
    );
  }

  if (!medicine) {
    return (
      <div className="container" style={{ padding: '4rem 1rem' }}>
        <div className="empty-state">
          <h3>Medicine not found</h3>
          <Link to="/search" className="btn btn-primary mt-3">Back to Search</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '2rem 1rem' }}>
      {/* Medicine Info */}
      <div className="card mb-4">
        <div className="card-body" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '2rem' }}>
            <div style={{ flex: '1 1 400px' }}>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <span className="badge badge-primary">{medicine.category}</span>
                <span className="badge badge-info">{medicine.dosageForm}</span>
                {medicine.prescriptionRequired && (
                  <span className="badge badge-warning">Prescription Required</span>
                )}
              </div>
              <h1 style={{ marginBottom: '0.5rem' }}>{medicine.name}</h1>
              {medicine.genericName && (
                <p className="text-muted" style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>
                  {medicine.genericName}
                </p>
              )}
              <p className="text-muted mb-3">
                by {medicine.manufacturer} | {medicine.strength}
              </p>
              {medicine.description && (
                <p className="text-muted">{medicine.description}</p>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              <p className="text-muted text-sm">MRP</p>
              <p style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--primary)' }}>
                Rs. {medicine.mrp}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Availability */}
      <h2 className="mb-3">
        Available at {availability.length} Nearby Pharmac{availability.length !== 1 ? 'ies' : 'y'}
      </h2>

      {availability.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {availability.map((stock) => (
            <div key={stock._id} className="card">
              <div className="card-body">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                  <div style={{ flex: '1 1 300px' }}>
                    <Link to={`/pharmacies/${stock.pharmacy._id}`} style={{ textDecoration: 'none' }}>
                      <h4 className="pharmacy-name">{stock.pharmacy.name}</h4>
                    </Link>
                    <p className="pharmacy-address">
                      {stock.pharmacy.address.street}, {stock.pharmacy.address.city}
                    </p>
                    {stock.distance && (
                      <p className="pharmacy-distance">{stock.distance} km away</p>
                    )}
                    <div style={{ marginTop: '0.5rem' }}>
                      <span className="text-sm text-muted">
                        {stock.quantity} units in stock
                      </span>
                      {stock.quantity < 10 && (
                        <span className="badge badge-warning" style={{ marginLeft: '0.5rem' }}>
                          Low Stock
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--primary)' }}>
                        Rs. {(stock.price - (stock.price * (stock.discount || 0) / 100)).toFixed(2)}
                      </span>
                      {stock.discount > 0 && (
                        <>
                          <span className="medicine-mrp">Rs. {stock.price}</span>
                          <span className="badge badge-success" style={{ marginLeft: '0.5rem' }}>
                            {stock.discount}% OFF
                          </span>
                        </>
                      )}
                    </div>
                    <button 
                      className="btn btn-primary"
                      onClick={() => handleAddToCart(stock)}
                    >
                      Add to Cart
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card">
          <div className="card-body text-center" style={{ padding: '3rem' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>😔</div>
            <h3>Not Available Nearby</h3>
            <p className="text-muted mb-3">
              This medicine is currently not available at any pharmacy in your area.
            </p>
            <button className="btn btn-primary" onClick={handleCreateAlert}>
              Notify Me When Available
            </button>
          </div>
        </div>
      )}

      {/* Back Button */}
      <div style={{ marginTop: '2rem' }}>
        <Link to="/search" className="btn btn-outline">
          &larr; Back to Search
        </Link>
      </div>
    </div>
  );
};

export default MedicineDetails;
