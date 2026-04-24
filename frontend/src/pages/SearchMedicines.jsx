import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { medicineAPI } from '../services/api';

const SearchMedicines = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [medicines, setMedicines] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pages: 1, total: 0 });
  
  const [filters, setFilters] = useState({
    q: searchParams.get('q') || '',
    category: searchParams.get('category') || '',
    prescriptionRequired: searchParams.get('prescription') || '',
    page: parseInt(searchParams.get('page')) || 1
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchMedicines();
  }, [filters]);

  const fetchCategories = async () => {
    try {
      const response = await medicineAPI.getCategories();
      setCategories(response.data.data.categories);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const fetchMedicines = async () => {
    setLoading(true);
    try {
      const params = { ...filters, limit: 12 };
      if (!params.q) delete params.q;
      if (!params.category) delete params.category;
      if (!params.prescriptionRequired) delete params.prescriptionRequired;

      const response = await medicineAPI.search(params);
      setMedicines(response.data.data.medicines);
      setPagination(response.data.data.pagination);

      // Update URL params
      const newParams = new URLSearchParams();
      if (filters.q) newParams.set('q', filters.q);
      if (filters.category) newParams.set('category', filters.category);
      if (filters.page > 1) newParams.set('page', filters.page);
      setSearchParams(newParams);
    } catch (error) {
      console.error('Failed to fetch medicines:', error);
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

  return (
    <div className="container" style={{ padding: '2rem 1rem' }}>
      <div className="page-header">
        <h1 className="page-title">Search Medicines</h1>
        <p className="page-subtitle">Find medicines and check their availability at nearby pharmacies</p>
      </div>

      {/* Search and Filters */}
      <div className="card mb-4">
        <div className="card-body">
          <form onSubmit={handleSearch}>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 300px' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Search by medicine name..."
                  value={filters.q}
                  onChange={(e) => setFilters(prev => ({ ...prev, q: e.target.value }))}
                />
              </div>
              <div style={{ flex: '0 1 200px' }}>
                <select
                  className="form-select"
                  value={filters.category}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                >
                  <option value="">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: '0 1 180px' }}>
                <select
                  className="form-select"
                  value={filters.prescriptionRequired}
                  onChange={(e) => handleFilterChange('prescriptionRequired', e.target.value)}
                >
                  <option value="">All Medicines</option>
                  <option value="false">OTC Only</option>
                  <option value="true">Prescription Only</option>
                </select>
              </div>
              <button type="submit" className="btn btn-primary">
                Search
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="text-center" style={{ padding: '3rem' }}>
          <div className="spinner"></div>
          <p className="mt-3 text-muted">Searching medicines...</p>
        </div>
      ) : medicines.length > 0 ? (
        <>
          <p className="text-muted mb-3">
            Found {pagination.total} medicine{pagination.total !== 1 ? 's' : ''}
          </p>
          
          <div className="grid grid-4">
            {medicines.map((medicine) => (
              <Link 
                key={medicine._id} 
                to={`/medicines/${medicine._id}`}
                style={{ textDecoration: 'none' }}
              >
                <div className="card medicine-card">
                  <div className="card-body">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                      <span className="badge badge-primary">{medicine.category}</span>
                      {medicine.prescriptionRequired && (
                        <span className="badge badge-warning">Rx</span>
                      )}
                    </div>
                    <h3 className="medicine-name">{medicine.name}</h3>
                    {medicine.genericName && (
                      <p className="medicine-generic">{medicine.genericName}</p>
                    )}
                    <p className="text-sm text-muted mb-2">{medicine.manufacturer}</p>
                    <p className="text-sm text-muted mb-3">{medicine.dosageForm} - {medicine.strength}</p>
                    <div style={{ display: 'flex', alignItems: 'baseline' }}>
                      <span className="medicine-price">Rs. {medicine.mrp}</span>
                      <span className="text-sm text-muted" style={{ marginLeft: 'auto' }}>MRP</span>
                    </div>
                  </div>
                  <div className="card-footer">
                    <span className="text-primary text-sm font-bold">Check Availability &rarr;</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="pagination">
              <button
                className="pagination-btn"
                disabled={pagination.current === 1}
                onClick={() => handlePageChange(pagination.current - 1)}
              >
                Previous
              </button>
              
              {[...Array(pagination.pages)].map((_, i) => (
                <button
                  key={i + 1}
                  className={`pagination-btn ${pagination.current === i + 1 ? 'active' : ''}`}
                  onClick={() => handlePageChange(i + 1)}
                >
                  {i + 1}
                </button>
              ))}
              
              <button
                className="pagination-btn"
                disabled={pagination.current === pagination.pages}
                onClick={() => handlePageChange(pagination.current + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">💊</div>
          <h3 className="empty-state-title">No medicines found</h3>
          <p className="empty-state-text">
            Try adjusting your search or filters to find what you are looking for
          </p>
        </div>
      )}
    </div>
  );
};

export default SearchMedicines;
