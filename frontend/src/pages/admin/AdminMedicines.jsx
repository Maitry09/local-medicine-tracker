import { useState, useEffect } from 'react';
import { medicineAPI } from '../../services/api';
import { useNotification } from '../../context/NotificationContext';

const AdminMedicines = () => {
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { showNotification } = useNotification();

  const [formData, setFormData] = useState({
    name: '',
    genericName: '',
    manufacturer: '',
    category: '',
    description: '',
    composition: '',
    dosageForm: 'tablet',
    strength: '',
    prescriptionRequired: false,
    sideEffects: '',
    contraindications: '',
  });

  useEffect(() => {
    fetchMedicines();
  }, [page]);

  const fetchMedicines = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (searchTerm) params.search = searchTerm;
      
      const response = await medicineAPI.getMedicines(params);
      setMedicines(response.data?.data?.medicines || []);
      setTotalPages(response.data?.data?.pagination?.pages || 1);
    } catch (error) {
      showNotification('Failed to fetch medicines', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchMedicines();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!editingMedicine) {
      showNotification('Please select a medicine to edit', 'error');
      return;
    }
    try {
      await medicineAPI.update(editingMedicine._id, { ...formData, mrp: Number(formData.mrp) });
      showNotification('Medicine updated successfully', 'success');
      setShowModal(false);
      resetForm();
      fetchMedicines();
    } catch (error) {
      showNotification(error.response?.data?.message || 'Failed to save medicine', 'error');
    }
  };

  const handleEdit = (medicine) => {
    setEditingMedicine(medicine);
    setFormData({
      name: medicine.name || '',
      genericName: medicine.genericName || '',
      manufacturer: medicine.manufacturer || '',
      category: medicine.category || '',
      description: medicine.description || '',
      composition: medicine.composition || '',
      dosageForm: medicine.dosageForm || 'tablet',
      strength: medicine.strength || '',
      mrp: medicine.mrp || '',
      prescriptionRequired: medicine.prescriptionRequired || false,
      sideEffects: medicine.sideEffects?.join(', ') || '',
      contraindications: medicine.contraindications?.join(', ') || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (medicineId) => {
    if (!window.confirm('Are you sure you want to delete this medicine?')) return;
    try {
      await medicineAPI.delete(medicineId);
      showNotification('Medicine deleted', 'success');
      fetchMedicines();
    } catch (error) {
      showNotification('Failed to delete medicine', 'error');
    }
  };

  const resetForm = () => {
    setEditingMedicine(null);
    setFormData({
      name: '',
      genericName: '',
      manufacturer: '',
      category: '',
      description: '',
      composition: '',
      dosageForm: 'tablet',
      strength: '',
      mrp: '',
      prescriptionRequired: false,
      sideEffects: '',
      contraindications: '',
    });
  };

  return (
    <div className="admin-medicines-page">
      <div className="page-header">
        <h1>Medicines Management</h1>
      </div>

      <div className="filters-bar">
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            placeholder="Search medicines..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button type="submit" className="btn btn-primary">
            Search
          </button>
        </form>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
        </div>
      ) : (
        <>
          <div className="medicines-table-container">
            <table className="medicines-table">
              <thead>
                <tr>
                  <th>Medicine</th>
                  <th>Generic Name</th>
                  <th>Manufacturer</th>
                  <th>Category</th>
                  <th>Form</th>
                  <th>Rx</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {medicines.map((medicine) => (
                  <tr key={medicine._id}>
                    <td>
                      <strong>{medicine.name}</strong>
                      {medicine.strength && <span className="strength"> ({medicine.strength})</span>}
                    </td>
                    <td>{medicine.genericName || '-'}</td>
                    <td>{medicine.manufacturer}</td>
                    <td>{medicine.category || '-'}</td>
                    <td>{medicine.dosageForm}</td>
                    <td>
                      {medicine.prescriptionRequired ? (
                        <span className="badge badge-warning">Rx</span>
                      ) : (
                        <span className="badge badge-success">OTC</span>
                      )}
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button onClick={() => handleEdit(medicine)} className="btn btn-outline btn-sm">
                          Edit
                        </button>
                        <button onClick={() => handleDelete(medicine._id)} className="btn btn-danger btn-sm">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn btn-outline"
              >
                Previous
              </button>
              <span>
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="btn btn-outline"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Add/Edit Medicine Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal modal-large">
            <div className="modal-header">
              <h2>Edit Medicine</h2>
              <button onClick={() => setShowModal(false)} className="close-btn">
                &times;
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Medicine Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Generic Name</label>
                  <input
                    type="text"
                    value={formData.genericName}
                    onChange={(e) => setFormData({ ...formData, genericName: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Manufacturer *</label>
                  <input
                    type="text"
                    value={formData.manufacturer}
                    onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Category</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="e.g., Antibiotics, Pain Relief"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Dosage Form</label>
                  <select
                    value={formData.dosageForm}
                    onChange={(e) => setFormData({ ...formData, dosageForm: e.target.value })}
                  >
                    <option value="tablet">Tablet</option>
                    <option value="capsule">Capsule</option>
                    <option value="syrup">Syrup</option>
                    <option value="injection">Injection</option>
                    <option value="cream">Cream</option>
                    <option value="ointment">Ointment</option>
                    <option value="drops">Drops</option>
                    <option value="inhaler">Inhaler</option>
                    <option value="powder">Powder</option>
                    <option value="suspension">Suspension</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Strength</label>
                  <input
                    type="text"
                    value={formData.strength}
                    onChange={(e) => setFormData({ ...formData, strength: e.target.value })}
                    placeholder="e.g., 500mg, 10ml"
                  />
                </div>
                <div className="form-group">
                  <label>MRP (Rs.) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.mrp}
                    onChange={(e) => setFormData({ ...formData, mrp: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Composition</label>
                <textarea
                  value={formData.composition}
                  onChange={(e) => setFormData({ ...formData, composition: e.target.value })}
                  rows="2"
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows="3"
                />
              </div>
              <div className="form-group">
                <label>Side Effects (comma separated)</label>
                <input
                  type="text"
                  value={formData.sideEffects}
                  onChange={(e) => setFormData({ ...formData, sideEffects: e.target.value })}
                  placeholder="Nausea, Headache, Dizziness"
                />
              </div>
              <div className="form-group">
                <label>Contraindications (comma separated)</label>
                <input
                  type="text"
                  value={formData.contraindications}
                  onChange={(e) => setFormData({ ...formData, contraindications: e.target.value })}
                  placeholder="Pregnancy, Liver disease"
                />
              </div>
              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.prescriptionRequired}
                    onChange={(e) => setFormData({ ...formData, prescriptionRequired: e.target.checked })}
                  />
                  <span>Prescription Required</span>
                </label>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-outline">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingMedicine ? 'Update Medicine' : 'Add Medicine'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMedicines;
