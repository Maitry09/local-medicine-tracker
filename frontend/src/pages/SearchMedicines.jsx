import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { medicineAPI } from '../services/api';

const SearchMedicines = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [medicines, setMedicines] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({ current: 1, pages: 1, total: 0 });

  // Keep filters as individual pieces of state — avoids object-reference dep issues
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [prescription, setPrescription] = useState(searchParams.get('prescription') || '');
  const [page, setPage] = useState(parseInt(searchParams.get('page')) || 1);

  // Debounce only the text query — other filters apply immediately
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 350);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    medicineAPI.getCategories()
      .then(res => setCategories(res.data.data.categories || []))
      .catch(() => {});
  }, []);

  // FIXED: depend on individual primitives, not an object — no infinite loop
  const fetchMedicines = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { page, limit: 12 };
      if (debouncedQuery) params.q = debouncedQuery;
      if (category) params.category = category;
      if (prescription) params.prescriptionRequired = prescription;

      const response = await medicineAPI.search(params);
      setMedicines(response.data.data.medicines || []);
      setPagination(response.data.data.pagination || { current: 1, pages: 1, total: 0 });

      // Sync URL without triggering another render
      const newParams = new URLSearchParams();
      if (debouncedQuery) newParams.set('q', debouncedQuery);
      if (category) newParams.set('category', category);
      if (page > 1) newParams.set('page', page);
      setSearchParams(newParams, { replace: true });
    } catch (err) {
      setError('Failed to fetch medicines. Please check your connection and try again.');
      setMedicines([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, category, prescription, page, setSearchParams]); // primitives only — safe

  useEffect(() => {
    fetchMedicines();
  }, [fetchMedicines]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1); // reset to first page on new search
  };

  const handleCategoryChange = (val) => {
    setCategory(val);
    setPage(1);
  };

  const handlePrescriptionChange = (val) => {
    setPrescription(val);
    setPage(1);
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
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
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setPage(1); }}
                />
              </div>
              <div style={{ flex: '0 1 200px' }}>
                <select
                  className="form-select"
                  value={category}
                  onChange={(e) => handleCategoryChange(e.target.value)}
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
                  value={prescription}
                  onChange={(e) => handlePrescriptionChange(e.target.value)}
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

      {/* Error state */}
      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>
          {error}
          <button onClick={fetchMedicines} style={{ marginLeft: '1rem' }} className="btn btn-sm btn-outline">
            Retry
          </button>
        </div>
      )}

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
      ) : !loading && (
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