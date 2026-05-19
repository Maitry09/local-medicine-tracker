import { useState, useEffect } from 'react';
import { pharmacyAPI } from '../../services/api';
import { useNotification } from '../../context/NotificationContext';

const PharmacyProfile = () => {
  const [pharmacy, setPharmacy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { showNotification } = useNotification();

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    licenseNumber: '',
    description: '',
    address: {
      street: '',
      city: '',
      state: '',
      pincode: '',
      coordinates: {
        lat: '',
        lng: ''
      }
    },
    operatingHours: {
      open: '09:00',
      close: '21:00',
    },
    isOpen: true,
    deliveryAvailable: false,
    deliveryRadius: 5,
  });

  useEffect(() => {
    fetchPharmacy();
  }, []);

  const fetchPharmacy = async () => {
    try {
      const response = await pharmacyAPI.getMyPharmacy();
      const data = response.data?.data?.pharmacy || response.data?.pharmacy;
      setPharmacy(data);
      if (data) {
        setFormData({
          name: data.name || '',
          phone: data.phone || '',
          email: data.email || '',
          licenseNumber: data.licenseNumber || '',
          description: data.description || '',
          address: data.address || {
            street: '',
            city: '',
            state: '',
            pincode: '',
            coordinates: { lat: '', lng: '' }
          },
          operatingHours: data.operatingHours || {
            open: '09:00',
            close: '21:00',
          },
          isOpen: data.isOpen ?? true,
          deliveryAvailable: data.deliveryAvailable ?? false,
          deliveryRadius: data.deliveryRadius || 5,
        });
      }
    } catch (error) {
      // Pharmacy might not exist yet
      console.log('Pharmacy not found, can create new one');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Ensure coordinates are numbers
      const coords = formData.address?.coordinates || { lat: '', lng: '' };
      const payload = {
        ...formData,
        address: {
          ...formData.address,
          coordinates: {
            lat: coords.lat === '' ? undefined : Number(coords.lat),
            lng: coords.lng === '' ? undefined : Number(coords.lng)
          }
        }
      };

      if (pharmacy) {
        await pharmacyAPI.updateMyPharmacy(payload);
        showNotification('Pharmacy profile updated successfully', 'success');
      } else {
        await pharmacyAPI.register(payload);
        showNotification('Pharmacy created successfully', 'success');
      }
      fetchPharmacy();
    } catch (error) {
      showNotification(error.response?.data?.message || 'Failed to save pharmacy', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading pharmacy profile...</p>
      </div>
    );
  }

  return (
    <div className="pharmacy-profile-page">
      <div className="page-header">
        <h1>{pharmacy ? 'Edit Pharmacy Profile' : 'Create Your Pharmacy'}</h1>
        <p>
          {pharmacy
            ? 'Update your pharmacy information and settings'
            : 'Set up your pharmacy to start receiving orders'}
        </p>
        {pharmacy?.status === 'rejected' && (
          <div className="alert alert-danger" style={{ marginTop: '0.5rem' }}>
            <strong>Application Rejected:</strong> {pharmacy.rejectionReason || 'No reason provided'}
          </div>
        )}
        {pharmacy?.status === 'approved' && (
          <div className="alert alert-success" style={{ marginTop: '0.5rem' }}>
            Your pharmacy is approved and visible to customers.
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="pharmacy-form">
        <section className="form-section">
          <h2>Basic Information</h2>
          <div className="form-row">
            <div className="form-group">
              <label>Pharmacy Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>License Number *</label>
              <input
                type="text"
                value={formData.licenseNumber}
                onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Phone Number *</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={formData.email}
                autoComplete="email"
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows="3"
              placeholder="Tell customers about your pharmacy..."
            />
          </div>
        </section>

        <section className="form-section">
          <h2>Address</h2>
          <div className="form-group">
            <label>Street Address *</label>
            <input
              type="text"
              value={formData.address.street}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  address: { ...formData.address, street: e.target.value },
                })
              }
              required
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>City *</label>
              <input
                type="text"
                value={formData.address.city}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    address: { ...formData.address, city: e.target.value },
                  })
                }
                required
              />
            </div>
            <div className="form-group">
              <label>State *</label>
              <input
                type="text"
                value={formData.address.state}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    address: { ...formData.address, state: e.target.value },
                  })
                }
                required
              />
            </div>
            <div className="form-group">
              <label>PIN Code *</label>
              <input
                type="text"
                value={formData.address.pincode}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    address: { ...formData.address, pincode: e.target.value },
                  })
                }
                required
              />
            </div>
            <div className="form-group">
              <label>Latitude *</label>
              <input
                type="number"
                step="any"
                value={formData.address.coordinates?.lat || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    address: {
                      ...formData.address,
                      coordinates: { ...formData.address.coordinates, lat: e.target.value }
                    }
                  })
                }
                required
              />
            </div>
            <div className="form-group">
              <label>Longitude *</label>
              <input
                type="number"
                step="any"
                value={formData.address.coordinates?.lng || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    address: {
                      ...formData.address,
                      coordinates: { ...formData.address.coordinates, lng: e.target.value }
                    }
                  })
                }
                required
              />
            </div>
          </div>
        </section>

        <section className="form-section">
          <h2>Operating Hours</h2>
          <div className="form-row">
            <div className="form-group">
              <label>Opening Time</label>
              <input
                type="time"
                value={formData.operatingHours.open}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    operatingHours: { ...formData.operatingHours, open: e.target.value },
                  })
                }
              />
            </div>
            <div className="form-group">
              <label>Closing Time</label>
              <input
                type="time"
                value={formData.operatingHours.close}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    operatingHours: { ...formData.operatingHours, close: e.target.value },
                  })
                }
              />
            </div>
          </div>
        </section>

        <section className="form-section">
          <h2>Settings</h2>
          <div className="toggle-group">
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={formData.isOpen}
                onChange={(e) => setFormData({ ...formData, isOpen: e.target.checked })}
              />
              <span>Store is Open</span>
            </label>
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={formData.deliveryAvailable}
                onChange={(e) => setFormData({ ...formData, deliveryAvailable: e.target.checked })}
              />
              <span>Delivery Available</span>
            </label>
          </div>
          {formData.deliveryAvailable && (
            <div className="form-group">
              <label>Delivery Radius (km)</label>
              <input
                type="number"
                value={formData.deliveryRadius}
                onChange={(e) => setFormData({ ...formData, deliveryRadius: e.target.value })}
                min="1"
                max="50"
              />
            </div>
          )}
        </section>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : pharmacy ? 'Update Profile' : 'Create Pharmacy'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PharmacyProfile;
