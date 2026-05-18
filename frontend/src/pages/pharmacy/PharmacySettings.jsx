import { useState, useEffect } from 'react';
import { pharmacyAPI } from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import  '../../styles/pharmacy-settings.css';

const PharmacySettings = () => {
  const [pharmacy, setPharmacy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    defaultDiscount: 0,
    defaultDeliveryFee: 0,
  });
  const { showNotification } = useNotification();

  useEffect(() => {
    fetchPharmacySettings();
  }, []);

  const fetchPharmacySettings = async () => {
    try {
      const res = await pharmacyAPI.getMyPharmacy();
      const myPharmacy = res.data?.data?.pharmacy || res.data?.pharmacy;
      
      if (myPharmacy) {
        setPharmacy(myPharmacy);
        setSettings({
          defaultDiscount: myPharmacy.defaultDiscount || 0,
          defaultDeliveryFee: myPharmacy.defaultDeliveryFee || 0,
        });
      }
    } catch (error) {
      console.error('Failed to fetch pharmacy:', error);
      showNotification('Failed to load pharmacy settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (settings.defaultDiscount < 0 || settings.defaultDiscount > 100) {
      showNotification('Discount must be between 0 and 100', 'error');
      return;
    }

    if (settings.defaultDeliveryFee < 0) {
      showNotification('Delivery fee cannot be negative', 'error');
      return;
    }

    setSaving(true);
    try {
      await pharmacyAPI.updateMyPharmacy({
        defaultDiscount: settings.defaultDiscount,
        defaultDeliveryFee: settings.defaultDeliveryFee,
      });
      showNotification('Settings saved successfully!', 'success');
    } catch (error) {
      console.error('Failed to save settings:', error);
      showNotification(error.response?.data?.message || 'Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading settings...</p>
      </div>
    );
  }

  if (!pharmacy) {
    return (
      <div className="empty-state">
        <h3>Pharmacy not found</h3>
        <p>Please set up your pharmacy profile first.</p>
      </div>
    );
  }

  return (
    <div className="pharmacy-settings-page">
      <div className="page-header">
        <h1>Pharmacy Settings</h1>
        <p>Configure your pharmacy policies and pricing</p>
      </div>

      <div className="settings-container">
        <div className="settings-card">
          <h2>Order Policies</h2>
          <p className="card-description">
            Set default discount and delivery fee for all orders from your pharmacy
          </p>

          <div className="form-group">
            <label htmlFor="discount">Default Discount (%)</label>
            <div className="input-with-icon">
              <input
                id="discount"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={settings.defaultDiscount}
                onChange={(e) => setSettings({ 
                  ...settings, 
                  defaultDiscount: parseFloat(e.target.value) || 0 
                })}
                className="form-control"
                placeholder="0"
              />
              <span className="input-icon">%</span>
            </div>
            <small className="form-text">
              Applied automatically to all new orders. Enter 0 for no discount.
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="delivery-fee">Default Delivery Fee (₹)</label>
            <div className="input-with-icon">
              <input
                id="delivery-fee"
                type="number"
                min="0"
                step="1"
                value={settings.defaultDeliveryFee}
                onChange={(e) => setSettings({ 
                  ...settings, 
                  defaultDeliveryFee: parseFloat(e.target.value) || 0 
                })}
                className="form-control"
                placeholder="0"
              />
              <span className="input-icon">₹</span>
            </div>
            <small className="form-text">
              Enter 0 for free delivery. This fee will be added to order total.
            </small>
          </div>

          <div className="preview-box">
            <h3>Preview</h3>
            <div className="preview-item">
              <span>Medicine Price:</span>
              <span>₹100.00</span>
            </div>
            {settings.defaultDiscount > 0 && (
              <div className="preview-item discount">
                <span>Discount ({settings.defaultDiscount}%):</span>
                <span>-₹{(100 * settings.defaultDiscount / 100).toFixed(2)}</span>
              </div>
            )}
            {settings.defaultDeliveryFee > 0 && (
              <div className="preview-item fee">
                <span>Delivery Fee:</span>
                <span>+₹{settings.defaultDeliveryFee.toFixed(2)}</span>
              </div>
            )}
            <div className="preview-item total">
              <span>Total:</span>
              <span>
                ₹{(100 - (100 * settings.defaultDiscount / 100) + settings.defaultDeliveryFee).toFixed(2)}
              </span>
            </div>
          </div>

          <div className="button-group">
            <button 
              className="btn btn-outline" 
              onClick={() => setSettings({
                defaultDiscount: pharmacy.defaultDiscount || 0,
                defaultDeliveryFee: pharmacy.defaultDeliveryFee || 0,
              })}
              disabled={saving}
            >
              Reset
            </button>
            <button 
              className="btn btn-primary" 
              onClick={handleSaveSettings}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>

        <div className="settings-info">
          <div className="info-card">
            <h3>💡 Tips</h3>
            <ul>
              <li>Adjust discount to remain competitive while maintaining profit</li>
              <li>Free delivery can attract more customers</li>
              <li>All customers will see these values in their cart</li>
              <li>Changes apply to new orders immediately</li>
            </ul>
          </div>

          <div className="info-card">
            <h3>📊 Current Settings</h3>
            <div className="setting-display">
              <div>
                <strong>Discount:</strong>
                <p className="value">{pharmacy.defaultDiscount || 0}%</p>
              </div>
              <div>
                <strong>Delivery Fee:</strong>
                <p className="value">₹{(pharmacy.defaultDeliveryFee || 0).toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PharmacySettings;
