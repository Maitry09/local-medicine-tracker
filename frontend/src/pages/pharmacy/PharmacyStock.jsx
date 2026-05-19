import { useState, useEffect } from 'react';
import api, { pharmacyAPI, stockAPI, medicineAPI } from '../../services/api';
import { useNotification } from '../../context/NotificationContext';

const PharmacyStock = () => {
  const [stocks, setStocks] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [categories, setCategories] = useState([]);
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
    expiryDate: '',
    batchNumber: ''
  });

  const [newMedicineDetails, setNewMedicineDetails] = useState({
    name: '',
    genericName: '',
    manufacturer: '',
    category: '',
    customCategory: '',
    dosageForm: '',
    strength: '',
    prescriptionRequired: false,
    description: ''
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData(searchTerm);
    }, 250);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await medicineAPI.getCategories();
        setCategories(res.data?.data?.categories || []);
      } catch (err) {
        console.error('Failed to load categories', err);
      }
    };

    loadCategories();
  }, []);

  const fetchData = async (search = '') => {
    try {
      setLoading(true);
      const [stockRes, medsRes] = await Promise.all([
        stockAPI.getMyStock({ search }),
        medicineAPI.getMedicines({ page: 1, limit: 100 })
      ]);
      setStocks(stockRes.data?.data?.stock || stockRes.data?.data?.stocks || []);
      setMedicines(medsRes.data?.data?.medicines || medsRes.data?.data?.medicine || []);
    } catch (err) {
      showNotification('Failed to fetch data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddStock = async (e) => {
    e.preventDefault();
    const isNewMedicine = formData.medicine === 'other';

    if (!formData.expiryDate) {
      showNotification('Expiry date is required', 'error');
      return;
    }

    if (isNewMedicine) {
      const categoryValue = newMedicineDetails.category === 'Other'
        ? newMedicineDetails.customCategory.trim()
        : newMedicineDetails.category.trim();

      if (!newMedicineDetails.name.trim() || !newMedicineDetails.manufacturer.trim() || !categoryValue) {
        showNotification('Please fill in name, manufacturer, and category for the new medicine.', 'error');
        return;
      }
    }

    try {
      const categoryValue = newMedicineDetails.category === 'Other'
        ? newMedicineDetails.customCategory.trim()
        : newMedicineDetails.category.trim();

      const stockPayload = {
        medicineId: isNewMedicine ? 'other' : formData.medicine,
        quantity: Number(formData.quantity),
        price: Number(formData.price),
        discount: 0,
        batchNumber: formData.batchNumber,
        expiryDate: formData.expiryDate
      };

      if (isNewMedicine) {
        stockPayload.newMedicine = {
          name: newMedicineDetails.name.trim(),
          genericName: newMedicineDetails.genericName.trim(),
          manufacturer: newMedicineDetails.manufacturer.trim(),
          category: categoryValue || 'Other',
          dosageForm: newMedicineDetails.dosageForm.trim(),
          strength: newMedicineDetails.strength.trim(),
          mrp: Number(formData.price),
          prescriptionRequired: Boolean(newMedicineDetails.prescriptionRequired),
          description: newMedicineDetails.description.trim()
        };
      }

      await stockAPI.addStock(stockPayload);
      showNotification('Stock added successfully', 'success');
      setShowAddModal(false);
      resetForm();
      setNewMedicineDetails({
        name: '',
        genericName: '',
        manufacturer: '',
        category: '',
        customCategory: '',
        dosageForm: '',
        strength: '',
        prescriptionRequired: false,
        description: ''
      });
      await fetchData(searchTerm);
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
      await fetchData();
    } catch (error) {
      showNotification(error.response?.data?.message || 'Failed to update stock', 'error');
    }
  };

  const handleDeleteStock = async (stockId) => {
    if (!window.confirm('Are you sure you want to delete this stock?')) return;
    try {
      await stockAPI.deleteStock(stockId);
      showNotification('Stock deleted successfully', 'success');
      await fetchData();
    } catch (error) {
      showNotification('Failed to delete stock', 'error');
    }
  };

  const openEditModal = (stock) => {
    setSelectedStock(stock);
    setFormData({
      medicine: stock.medicine?._id || stock.medicine || '',
      quantity: String(stock.quantity ?? ''),
      price: String(stock.price ?? ''),
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
      expiryDate: '',
      batchNumber: ''
    });
    setNewMedicineDetails({
      name: '',
      genericName: '',
      manufacturer: '',
      category: '',
      customCategory: '',
      dosageForm: '',
      strength: '',
      mrp: '',
      prescriptionRequired: false,
      description: ''
    });
  };

  const selectedStockItem = stocks.find(
    (stock) => stock.medicine?._id === formData.medicine
  );

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
                <td>{stock.quantity ?? '-'}</td>
                <td>Rs. {(Number(stock.price) || 0).toFixed(2)}</td>
                <td>{stock.batchNumber || '-'}</td>
                <td>
                  {stock.expiryDate
                    ? new Date(stock.expiryDate).toLocaleDateString()
                    : '-'}
                </td>
                <td>
                  <span
                    className={`badge ${
                      Number(stock.quantity ?? 0) === 0
                        ? 'badge-danger'
                        : 'badge-success'
                    }`}
                  >
                    {stock.quantity === 0 ? 'Out of Stock' : 'In Stock'}
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
                  <option value="other">Other (add new medicine)</option>
                </select>
              </div>

              {formData.medicine === 'other' ? (
                <div className="new-medicine-section">
                  <h4>New Medicine Details</h4>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Name</label>
                      <input
                        type="text"
                        value={newMedicineDetails.name}
                        onChange={(e) => setNewMedicineDetails({ ...newMedicineDetails, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Generic Name</label>
                      <input
                        type="text"
                        value={newMedicineDetails.genericName}
                        onChange={(e) => setNewMedicineDetails({ ...newMedicineDetails, genericName: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Manufacturer</label>
                      <input
                        type="text"
                        value={newMedicineDetails.manufacturer}
                        onChange={(e) => setNewMedicineDetails({ ...newMedicineDetails, manufacturer: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Category</label>
                      <select
                        value={newMedicineDetails.category}
                        onChange={(e) => setNewMedicineDetails({ ...newMedicineDetails, category: e.target.value, customCategory: '' })}
                        required
                      >
                        <option value="">Select Category</option>
                        {categories.map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                        <option value="Other">Other</option>
                      </select>
                      {newMedicineDetails.category === 'Other' && (
                        <input
                          type="text"
                          placeholder="Enter custom category"
                          value={newMedicineDetails.customCategory}
                          onChange={(e) => setNewMedicineDetails({ ...newMedicineDetails, customCategory: e.target.value })}
                          required
                        />
                      )}
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Dosage Form</label>
                      <input
                        type="text"
                        value={newMedicineDetails.dosageForm}
                        onChange={(e) => setNewMedicineDetails({ ...newMedicineDetails, dosageForm: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Strength</label>
                      <input
                        type="text"
                        value={newMedicineDetails.strength}
                        onChange={(e) => setNewMedicineDetails({ ...newMedicineDetails, strength: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group checkbox-group">
                      <label>
                        <input
                          type="checkbox"
                          checked={newMedicineDetails.prescriptionRequired}
                          onChange={(e) => setNewMedicineDetails({ ...newMedicineDetails, prescriptionRequired: e.target.checked })}
                        />
                        Prescription required
                      </label>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Description</label>
                    <textarea
                      value={newMedicineDetails.description}
                      onChange={(e) => setNewMedicineDetails({ ...newMedicineDetails, description: e.target.value })}
                    />
                  </div>
                </div>
              ) : selectedStockItem && (
                <div className="form-group current-stock-info">
                  <label>Current stock</label>
                  <div>{selectedStockItem.quantity ?? 0} units</div>
                </div>
              )}
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
