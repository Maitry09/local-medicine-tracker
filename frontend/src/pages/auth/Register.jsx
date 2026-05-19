import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';

const Register = () => {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const roleParam = params.get('role');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: roleParam || 'patient',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState('');
  const { register } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    const sanitizedValue = name === 'phone' ? value.replace(/\D/g, '') : value;
    setFormData({ ...formData, [name]: sanitizedValue });
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
    setGeneralError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('📝 Form submitted with data:', formData);

    // Reset errors
    setErrors({});
    setGeneralError('');

    // Client-side validation
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Full name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (formData.phone && !/^[0-9]{10}$/.test(formData.phone)) {
      newErrors.phone = 'Phone number must be exactly 10 digits (or leave blank)';
    }

    if (Object.keys(newErrors).length > 0) {
      console.log('❌ Validation errors:', newErrors);
      setErrors(newErrors);
      return;
    }

    setLoading(true);

    try {
      console.log('🔄 Calling register function...');
      const user = await register({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        role: formData.role,
      });

      console.log('✅ Registration successful, user:', user);
      
      // Show success notification with details
      showNotification(
        `🎉 Welcome ${user.name}! Account created successfully. Redirecting...`,
        'success',
        4000
      );

      // Redirect based on role after registration
      setTimeout(() => {
        if (user.role === 'admin') {
          navigate('/admin/dashboard', { replace: true });
        } else if (user.role === 'pharmacy') {
          navigate('/pharmacy/dashboard', { replace: true });
        } else {
          navigate('/', { replace: true });
        }
      }, 1500);
    } catch (error) {
      console.error('❌ Registration error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Registration failed. Please try again.';
      
      // Show error notification
      showNotification(`❌ ${errorMessage}`, 'error', 5000);
      
      // Set error in form if it's a field-level error
      if (error.response?.status === 400) {
        setGeneralError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-form-container">
      <h1>Create Account</h1>
      <p className="auth-subtitle">Join MedFinder today</p>

      {generalError && (
        <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>
          {generalError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="auth-form">
        <div className="form-group">
          <label htmlFor="name" className="form-label">Full Name</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Enter your full name"
            className={`form-input ${errors.name ? 'input-error' : ''}`}
            required
          />
          {errors.name && <small className="error-text">{errors.name}</small>}
        </div>

        <div className="form-group">
          <label htmlFor="email" className="form-label">Email Address</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Enter your email"
            autoComplete="email"
            className={`form-input ${errors.email ? 'input-error' : ''}`}
            required
          />
          {errors.email && <small className="error-text">{errors.email}</small>}
        </div>

        <div className="form-group">
          <label htmlFor="phone" className="form-label">Phone Number</label>
          <input
            type="tel"
            id="phone"
            name="phone"
            pattern="[0-9]{10}"
            maxLength="10"
            value={formData.phone}
            onChange={handleChange}
            placeholder="Enter 10-digit phone number (optional)"
            className={`form-input ${errors.phone ? 'input-error' : ''}`}
          />
          {errors.phone && <small className="error-text">{errors.phone}</small>}
        </div>

        <div className="form-group">
          <label htmlFor="role" className="form-label">Account Type</label>
          {roleParam === 'pharmacy' ? (
            <input type="text" readOnly value="Pharmacy Owner" className="form-input" />
          ) : (
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              className={`form-select ${errors.role ? 'input-error' : ''}`}
              required
            >
              <option value="patient">Patient</option>
              <option value="pharmacy">Pharmacy Owner</option>
            </select>
          )}
          {errors.role && <small className="error-text">{errors.role}</small>}
        </div>

        <div className="form-group">
          <label htmlFor="password" className="form-label">Password</label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Create a password (min 6 chars)"
            className={`form-input ${errors.password ? 'input-error' : ''}`}
            autoComplete="new-password"
            required
          />
          {errors.password && <small className="error-text">{errors.password}</small>}
        </div>

        <div className="form-group">
          <label htmlFor="confirmPassword" className="form-label">Confirm Password</label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            autoComplete="new-password"
            value={formData.confirmPassword}
            onChange={handleChange}
            placeholder="Confirm your password"
            className={`form-input ${errors.confirmPassword ? 'input-error' : ''}`}
            required
          />
          {errors.confirmPassword && <small className="error-text">{errors.confirmPassword}</small>}
        </div>

        <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
          {loading ? 'Creating Account...' : 'Create Account'}
        </button>
      </form>

      <p className="auth-footer">
        Already have an account? <Link to="/login">Sign In</Link>
      </p>
    </div>
  );
};

export default Register;