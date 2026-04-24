import { useState, useEffect } from 'react';
import { pharmacyAPI, stockAPI, medicineAPI } from '../../services/api';
import { useNotification } from '../../context/NotificationContext';

const PharmacyStock = () => {
  const [stocks, setStocks] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedStock, setSelectedStock] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { showNotification } = useNotification();

  const [formData, setFormData] = useState({
    medicine: '',
    quantity: '',
    price: '',
    lowStockThreshold: '10',
    expiryDate: '',
    batchNumber: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [stockRes, medicineRes] = await Promise.all([
        pharmacyAPI.getMyPharmacyStock(),
        medicineAPI.getMedicines({ limit: 1000 }),
      ]);
      setStocks(stockRes.data.stocks);
      setMedicines(medicineRes.data.medicines);
    } catch (error) {
      showNotification('Failed to fetch data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddStock = async (e) => {
    e.preventDefault();
    try {
      await stockAPI.addStock(formData);
      showNotification('Stock added successfully', 'success');
      setShowAddModal(false);
      resetForm();
      fetchData();
    } catch (error) {
      showNotification(error.response?.data?.message || 'Failed to add stock', 'error');
    }
  };

  const handleUpdateStock = async (e) => {
    e.preventDefault();
    try {
      await stockAPI.updateStock(selectedStock._id, formData);
      showNotification('Stock updated successfully', 'success');
      setShowEditModal(false);
      setSelectedStock(null);
      resetForm();
      fetchData();
    } catch (error) {
      showNotification(error.response?.data?.message || 'Failed to update stock', 'error');
    }
  };

  const handleDeleteStock = async (stockId) => {
    if (!window.confirm('Are you sure you want to delete this stock?')) return;
    try {
      await stockAPI.deleteStock(stockId);
      showNotification('Stock deleted successfully', 'success');
      fetchData();
    } catch (error) {
      showNotification('Failed to delete stock', 'error');
    }
  };

  const openEditModal = (stock) => {
    setSelectedStock(stock);
    setFormData({
      medicine: stock.medicine._id,
      quantity: stock.quantity.toString(),
      price: stock.price.toString(),
      lowStockThreshold: stock.lowStockThreshold.toString(),
      expiryDate: stock.expiryDate ? stock.expiryDate.split('T')[0] : '',
      batchNumber: stock.batchNumber || '',
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      medicine: '',
      quantity: '',
      price: '',
      lowStockThreshold: '10',
      expiryDate: '',
      batchNumber: '',
    });
  };

  const filteredStocks = stocks.filter((stock) =>
    stock.medicine?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading stock...</p>
      </div>
    );
  }

  return (
    <div className="stock-page">
      <div className="page-header">
        <h1>Stock Management</h1>
        <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
          Add Stock
        </button>
      </div>

      <div className="stock-filters">
        <input
          type="text"
          placeholder="Search medicines..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      <div className="stock-table-container">
        <table className="stock-table">
          <thead>
            <tr>
              <th>Medicine</th>
              <th>Quantity</th>
              <th>Price</th>
              <th>Batch</th>
              <th>Expiry</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredStocks.map((stock) => (
              <tr key={stock._id}>
                <td>
                  <div className="medicine-info">
                    <strong>{stock.medicine?.name}</strong>
                    <span>{stock.medicine?.manufacturer}</span>
                  </div>
                </td>
                <td>{stock.quantity}</td>
                <td>Rs. {stock.price.toFixed(2)}</td>
                <td>{stock.batchNumber || '-'}</td>
                <td>
                  {stock.expiryDate
                    ? new Date(stock.expiryDate).toLocaleDateString()
                    : '-'}
                </td>
                <td>
                  <span
                    className={`badge ${
                      stock.quantity === 0
                        ? 'badge-danger'
                        : stock.quantity <= stock.lowStockThreshold
                        ? 'badge-warning'
                        : 'badge-success'
                    }`}
                  >
                    {stock.quantity === 0
                      ? 'Out of Stock'
                      : stock.quantity <= stock.lowStockThreshold
                      ? 'Low Stock'
                      : 'In Stock'}
                  </span>
                </td>
                <td>
                  <div className="action-buttons">
                    <button
                      onClick={() => openEditModal(stock)}
                      className="btn btn-outline btn-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteStock(stock._id)}
                      className="btn btn-danger btn-sm"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Stock Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Add Stock</h2>
              <button onClick={() => setShowAddModal(false)} className="close-btn">
                &times;
              </button>
            </div>
            <form onSubmit={handleAddStock}>
              <div className="form-group">
                <label>Medicine</label>
                <select
                  value={formData.medicine}
                  onChange={(e) => setFormData({ ...formData, medicine: e.target.value })}
                  required
                >
                  <option value="">Select Medicine</option>
                  {medicines.map((med) => (
                    <option key={med._id} value={med._id}>
                      {med.name} - {med.manufacturer}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Quantity</label>
                  <input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Price (Rs.)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Low Stock Threshold</label>
                  <input
                    type="number"
                    value={formData.lowStockThreshold}
                    onChange={(e) =>
                      setFormData({ ...formData, lowStockThreshold: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Batch Number</label>
                  <input
                    type="text"
                    value={formData.batchNumber}
                    onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Expiry Date</label>
                <input
                  type="date"
                  value={formData.expiryDate}
                  onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-outline">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Add Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Stock Modal */}
      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Edit Stock</h2>
              <button onClick={() => setShowEditModal(false)} className="close-btn">
                &times;
              </button>
            </div>
            <form onSubmit={handleUpdateStock}>
              <div className="form-group">
                <label>Medicine</label>
                <input type="text" value={selectedStock?.medicine?.name} disabled />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Quantity</label>
                  <input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Price (Rs.)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Low Stock Threshold</label>
                  <input
                    type="number"
                    value={formData.lowStockThreshold}
                    onChange={(e) =>
                      setFormData({ ...formData, lowStockThreshold: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Batch Number</label>
                  <input
                    type="text"
                    value={formData.batchNumber}
                    onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Expiry Date</label>
                <input
                  type="date"
                  value={formData.expiryDate}
                  onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowEditModal(false)} className="btn btn-outline">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Update Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PharmacyStock;
