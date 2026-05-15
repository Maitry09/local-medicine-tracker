import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

export default function PatientDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalOrders: 0,
    activeOrders: 0,
    activeAlerts: 0,
    savedPharmacies: 0
  });
  const [prescriptionFile, setPrescriptionFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [reminders, setReminders] = useState(() => {
    if (typeof window !== 'undefined') {
      return JSON.parse(localStorage.getItem('medicineReminders') || '[]');
    }
    return [];
  });
  const [reminderName, setReminderName] = useState('');
  const [reminderTime, setReminderTime] = useState('08:00');
  const [reminderError, setReminderError] = useState('');
  const [notificationSupport, setNotificationSupport] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const remindersRef = useRef([]);
  const audioContextRef = useRef(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const [ordersRes, alertsRes] = await Promise.allSettled([
        api.get('/orders/my-orders'),
        api.get('/alerts')
      ]);

      let orders = [];
      let alerts = [];

      if (ordersRes.status === 'fulfilled') {
        orders = ordersRes.value?.data?.data?.orders || [];
      }

      if (alertsRes.status === 'fulfilled') {
        alerts = alertsRes.value?.data?.data?.alerts || [];
      }

      setStats({
        totalOrders: orders.length,
        activeOrders: orders.filter(
          (o) =>
            o.status === 'pending' ||
            o.status === 'confirmed' ||
            o.status === 'processing' ||
            o.status === 'ready'
        ).length,
        activeAlerts: alerts.length,
        savedPharmacies: 0
      });
    } catch (error) {
      console.log('Dashboard fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setNotificationSupport(typeof window !== 'undefined' && 'Notification' in window);
    if (typeof window !== 'undefined') {
      const savedReminders = localStorage.getItem('medicineReminders');
      if (savedReminders) {
        setReminders(JSON.parse(savedReminders));
      }
    }
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      setNotificationsEnabled(true);
    }
  }, []);

  useEffect(() => {
    remindersRef.current = reminders;
    if (typeof window !== 'undefined') {
      localStorage.setItem('medicineReminders', JSON.stringify(reminders));
    }
  }, [reminders]);

  const requestNotificationPermission = async () => {
    if (!notificationSupport) return;
    const permission = await Notification.requestPermission();
    setNotificationsEnabled(permission === 'granted');
  };

  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      const currentTime = now.toTimeString().slice(0, 5);
      const today = now.toISOString().slice(0, 10);
      const currentReminders = remindersRef.current;

      const nextReminders = currentReminders.map((reminder) => {
        if (reminder.time === currentTime && reminder.lastTriggered !== today) {
          triggerNotification(reminder);
          return { ...reminder, lastTriggered: today };
        }
        return reminder;
      });

      const hasChanged = nextReminders.some(
        (next, index) => next.lastTriggered !== currentReminders[index].lastTriggered
      );
      if (hasChanged) {
        setReminders(nextReminders);
      }
    };

    checkReminders();
    const interval = setInterval(checkReminders, 15000);
    return () => clearInterval(interval);
  }, []);

  const playBeep = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const audioCtx = audioContextRef.current || new AudioContext();
      audioContextRef.current = audioCtx;
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.001, audioCtx.currentTime);
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.start();
      gainNode.gain.exponentialRampToValueAtTime(0.2, audioCtx.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);
      oscillator.stop(audioCtx.currentTime + 0.4);
    } catch (err) {
      console.warn('Beep sound failed', err);
    }
  };

  const triggerNotification = (reminder) => {
    const reminderMessage = `Time to take ${reminder.medicineName}`;

    if (notificationSupport && Notification.permission === 'granted') {
      new Notification('Medicine Reminder', {
        body: reminderMessage,
      });
    }

    playBeep();
  };

  const handleFileSelection = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setPrescriptionFile(file);
    setPreview(file.type.startsWith('image/') ? URL.createObjectURL(file) : null);
    setUploadStatus(null);
  };

  const clearPrescriptionForm = () => {
    setPrescriptionFile(null);
    setPreview(null);
    setUploadStatus(null);
  };

  const handleUploadPrescription = async () => {
    if (!prescriptionFile) {
      setUploadStatus({ type: 'error', message: 'Please choose a prescription file first.' });
      return;
    }

    setUploading(true);
    setUploadStatus(null);

    try {
      const formData = new FormData();
      formData.append('prescription', prescriptionFile);

      await api.post('/prescriptions/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setUploadStatus({ type: 'success', message: 'Prescription uploaded successfully.' });
      clearPrescriptionForm();
      await fetchDashboardData();
    } catch (error) {
      setUploadStatus({
        type: 'error',
        message: error.response?.data?.message || 'Upload failed. Please try again.',
      });
    } finally {
      setUploading(false);
    }
  };

  const addReminder = (event) => {
    event.preventDefault();
    if (!reminderName.trim()) {
      setReminderError('Please enter a medicine name before adding the reminder.');
      return;
    }

    const newReminder = {
      id: Date.now().toString(),
      medicineName: reminderName.trim(),
      time: reminderTime,
      lastTriggered: '',
    };

    setReminders((prev) => [...prev, newReminder]);
    setReminderName('');
    setReminderTime('08:00');
    setReminderError('');

    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5);
    const today = now.toISOString().slice(0, 10);
    if (newReminder.time === currentTime) {
      triggerNotification(newReminder);
      setReminders((prev) => prev.map((reminder) =>
        reminder.id === newReminder.id ? { ...reminder, lastTriggered: today } : reminder
      ));
    }
  };

  const removeReminder = (id) => {
    setReminders((prev) => prev.filter((reminder) => reminder.id !== id));
  };

  if (loading) {
    return (
      <div style={{ padding: '20px' }}>
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <div style={{ width: '40px', height: '40px', border: '4px solid #f0f0f0', borderTop: '4px solid #1976d2', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 20px' }}></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <h1>Welcome back, {user?.name?.split(' ')[0] || 'Patient'}!</h1>
        <p>Track your orders and medicine alerts</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div style={{ background: 'white', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '20px' }}>
          <h3>Total Orders</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: '10px 0' }}>{stats.totalOrders}</p>
        </div>

        <div style={{ background: 'white', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '20px' }}>
          <h3>Active Orders</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: '10px 0' }}>{stats.activeOrders}</p>
        </div>

        <div style={{ background: 'white', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '20px' }}>
          <h3>Active Alerts</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: '10px 0' }}>{stats.activeAlerts}</p>
        </div>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h2>Prescription Upload</h2>
        <div style={{ padding: '20px', background: '#fff', border: '1px solid #e0e0e0', borderRadius: '8px', marginTop: '15px' }}>
          <p style={{ marginBottom: '0.5rem' }}>
            Upload a prescription for review.
          </p>
          <p className="text-muted" style={{ marginBottom: '1rem' }}>
            Select an image or PDF to upload. You can upload a prescription even if it is not tied to a specific order.
          </p>

          <div style={{ display: 'grid', gap: '1rem' }}>
            <label style={{ display: 'block' }}>
              <span style={{ display: 'block', marginBottom: '0.5rem' }}>Choose prescription file</span>
              <input type="file" accept="image/*,application/pdf" onChange={handleFileSelection} />
            </label>
            {preview && (
              <div style={{ border: '1px solid #ddd', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                <img src={preview} alt="Prescription preview" style={{ maxWidth: '100%', maxHeight: 220, borderRadius: 6 }} />
              </div>
            )}
            {prescriptionFile && (
              <div style={{ padding: '0.75rem', background: '#f0f7ff', borderRadius: 6 }}>
                <strong>Selected file:</strong> {prescriptionFile.name} ({(prescriptionFile.size / 1024).toFixed(1)} KB)
              </div>
            )}
            {uploadStatus && (
              <div style={{ color: uploadStatus.type === 'error' ? '#b00020' : '#0b6623', background: uploadStatus.type === 'error' ? '#fdecea' : '#e8f5e9', padding: '0.75rem', borderRadius: 6 }}>
                {uploadStatus.message}
              </div>
            )}
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={handleUploadPrescription} disabled={uploading || !prescriptionFile}>
                {uploading ? 'Uploading...' : 'Upload Prescription'}
              </button>
              <button className="btn btn-outline" onClick={clearPrescriptionForm} disabled={uploading}>
                Clear
              </button>
            </div>
          </div>
        </div>

      </div>

      <div>
        <h2>Medicine Reminders</h2>
        <div style={{ padding: '20px', background: '#fff', border: '1px solid #e0e0e0', borderRadius: '8px', marginTop: '15px' }}>
          <div style={{ marginBottom: '1rem' }}>
            <p style={{ margin: 0, fontWeight: '600' }}>Set a daily medicine reminder</p>
            <p className="text-muted" style={{ margin: '0.5rem 0 0' }}>
              Get an alert and sound when it’s time to take your medicine. Enable browser notifications for the best experience.
            </p>
          </div>
          <form onSubmit={addReminder} style={{ display: 'grid', gap: '1rem' }}>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              <label style={{ fontWeight: '600' }}>Medicine name</label>
              <input
                type="text"
                value={reminderName}
                onChange={(e) => {
                  setReminderName(e.target.value);
                  if (reminderError) setReminderError('');
                }}
                className="form-control"
                placeholder="e.g. Paracetamol"
                style={{ padding: '0.85rem', borderRadius: '8px', border: '1px solid #ced4da' }}
              />
            </div>
            {reminderError && (
              <div style={{ color: '#b00020', background: '#fdecea', padding: '0.75rem', borderRadius: 6 }}>
                {reminderError}
              </div>
            )}
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              <label style={{ fontWeight: '600' }}>Reminder time</label>
              <input
                type="time"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
                className="form-control"
                style={{ padding: '0.85rem', borderRadius: '8px', border: '1px solid #ced4da' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" type="submit" style={{ minWidth: 180 }}>
                Add Reminder
              </button>
              {notificationSupport && (
                <button type="button" className="btn btn-outline" onClick={requestNotificationPermission} style={{ minWidth: 220 }}>
                  {notificationsEnabled ? 'Notifications Enabled' : 'Enable Browser Notifications'}
                </button>
              )}
              <button type="button" className="btn btn-secondary" onClick={() => playBeep()} style={{ minWidth: 140 }}>
                Test Alert Sound
              </button>
            </div>
          </form>
          {!notificationSupport && (
            <p className="text-muted" style={{ marginTop: '1rem' }}>
              Browser notifications are not available in this environment, but sound alerts will still play if the browser allows audio.
            </p>
          )}
          {notificationsEnabled && (
            <p className="text-success" style={{ marginTop: '1rem' }}>
              Notifications are enabled. You’ll receive a popup and a beep when your reminder time arrives.
            </p>
          )}
        </div>

        <div style={{ marginTop: '20px', display: 'grid', gap: '10px' }}>
          {reminders.length === 0 ? (
            <div style={{ padding: '20px', background: '#fff', border: '1px solid #e0e0e0', borderRadius: '8px' }}>
              <p>No reminders yet.</p>
              <p className="text-muted" style={{ marginTop: '0.5rem' }}>
                Set daily reminders for your medicines and receive browser notifications when it’s time to take them.
              </p>
            </div>
          ) : (
            reminders.map((reminder) => (
              <div key={reminder.id} style={{ background: 'white', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <p style={{ margin: 0 }}><strong>{reminder.medicineName}</strong></p>
                    <p className="text-muted" style={{ margin: '0.25rem 0 0' }}>Daily at {reminder.time}</p>
                  </div>
                  <button className="btn btn-outline btn-sm" onClick={() => removeReminder(reminder.id)}>
                    Remove
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
