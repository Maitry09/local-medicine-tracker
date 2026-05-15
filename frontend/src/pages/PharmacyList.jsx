import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { pharmacyAPI } from '../services/api';


const PharmacyList = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [pharmacies, setPharmacies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ current: 1, pages: 1, total: 0 });
  const [userLocation, setUserLocation] = useState(null);

  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    city: searchParams.get('city') || '',
    is24Hours: searchParams.get('24hrs') || '',
    page: parseInt(searchParams.get('page')) || 1
  });

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        () => {
          setUserLocation({ lat: 28.6139, lng: 77.209 }); // fallback
        }
      );
    }
  }, []);

  useEffect(() => {
    fetchPharmacies();
  }, [filters.search, filters.city, filters.is24Hours, filters.page, userLocation?.lat, userLocation?.lng]);

  const fetchPharmacies = async () => {
    setLoading(true);
    try {
      const params = {
        ...filters,
        isVerified: true,
        limit: 12,
        ...(userLocation && { lat: userLocation.lat, lng: userLocation.lng, radius: 50 })
      };

      if (!params.search) delete params.search;
      if (!params.city) delete params.city;
      if (!params.is24Hours) delete params.is24Hours;

      const response = await pharmacyAPI.getAll(params);
      setPharmacies(response.data.data.pharmacies);
      setPagination(response.data.data.pagination);
    } catch (error) {
      console.error('Failed to fetch pharmacies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setFilters(prev => ({ ...prev, page: 1 }));
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const handlePageChange = (page) => {
    setFilters(prev => ({ ...prev, page }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const isOpen = (pharmacy) => {
    if (pharmacy.operatingHours.is24Hours) return true;

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const [openHour, openMin] = pharmacy.operatingHours.open.split(':').map(Number);
    const [closeHour, closeMin] = pharmacy.operatingHours.close.split(':').map(Number);

    const openTime = openHour * 60 + openMin;
    const closeTime = closeHour * 60 + closeMin;

    return currentTime >= openTime && currentTime <= closeTime;
  };

  return (
    <div className="container" style={{ padding: '2rem 1rem' }}>
      <div className="page-header">
        <h1 className="page-title">Find Pharmacies</h1>
        <p className="page-subtitle">Discover verified pharmacies near you</p>
      </div>

    
      {/* Results */}
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="grid grid-3">
          {pharmacies.map((pharmacy) => (
            <Link key={pharmacy._id} to={`/pharmacies/${pharmacy._id}`}>
              <div className="card">
                <div className="card-body">
                  <h3>{pharmacy.name}</h3>
                  <p>{pharmacy.address.city}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default PharmacyList;