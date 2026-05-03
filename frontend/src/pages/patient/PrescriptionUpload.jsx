import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useNotification } from '../../context/NotificationContext';

export default function PrescriptionUpload() {
  const { id: orderId } = useParams();
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    if (f.type.startsWith('image/')) setPreview(URL.createObjectURL(f));
    else setPreview(null);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('prescription', file);
      formData.append('orderId', orderId);
      await api.post('/prescriptions/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      showNotification('✅ Prescription uploaded! Pharmacy will review shortly.', 'success', 4000);
      navigate(`/orders/${orderId}`);
    } catch (err) {
      showNotification(err.response?.data?.message || 'Upload failed', 'error', 4000);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ maxWidth: 520, margin: '2rem auto', padding: '0 1rem' }}>
      <h2>Upload Prescription</h2>
      <p className="text-muted">Order #{orderId.slice(-8).toUpperCase()}</p>

      <div className="card" style={{ marginTop: '1.5rem' }}>
        <div className="card-body">
          <div style={{
            border: '2px dashed #1976d2', borderRadius: 8, padding: '2rem',
            textAlign: 'center', cursor: 'pointer', background: '#f8f9ff'
          }} onClick={() => document.getElementById('rxFile').click()}>
            {preview
              ? <img src={preview} alt="Preview" style={{ maxWidth: '100%', maxHeight: 300, borderRadius: 6 }} />
              : <>
                  <div style={{ fontSize: 48 }}>📋</div>
                  <p style={{ margin: '0.5rem 0 0' }}>Click to select prescription image or PDF</p>
                  <small className="text-muted">Max 5MB · JPG, PNG, PDF</small>
                </>
            }
            <input id="rxFile" type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={handleFile} />
          </div>

          {file && (
            <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#f0f7ff', borderRadius: 6 }}>
              <strong>Selected:</strong> {file.name} ({(file.size / 1024).toFixed(1)} KB)
            </div>
          )}

          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
            <button className="btn btn-outline" onClick={() => navigate(-1)} disabled={uploading}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleUpload} disabled={!file || uploading} style={{ flex: 1 }}>
              {uploading ? 'Uploading...' : 'Upload Prescription'}
            </button>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '1rem', background: '#fff8e1' }}>
        <div className="card-body" style={{ padding: '1rem' }}>
          <strong>📌 Instructions</strong>
          <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem', fontSize: 14 }}>
            <li>Upload a clear photo or scan of your doctor's prescription</li>
            <li>Ensure the doctor's name, date, and signature are visible</li>
            <li>Pharmacy will review within 2–4 hours</li>
            <li>Your order will be confirmed after approval</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
