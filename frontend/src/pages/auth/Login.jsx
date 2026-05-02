import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState('');
  const { login } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) setErrors({ ...errors, [name]: '' });
    setGeneralError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setGeneralError('');

    const newErrors = {};
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    if (!formData.password.trim()) newErrors.password = 'Password is required';
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }

    setLoading(true);
    try {
      const user = await login(formData.email, formData.password);
      showNotification(`🎉 Welcome back, ${user.name}!`, 'success', 3000);

      if (user.role === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      } else if (user.role === 'pharmacy') {
        navigate('/pharmacy/dashboard', { replace: true });
      } else {
        const safePath = from && from !== '/login' && from !== '/register' ? from : '/dashboard';
        navigate(safePath, { replace: true });
      }
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Login failed. Please try again.';
      showNotification(`❌ ${message}`, 'error', 5000);
      setGeneralError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-form-container">
      <h1>Welcome Back</h1>
      <p className="auth-subtitle">Sign in to your account</p>

      {generalError && (
        <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>{generalError}</div>
      )}

      <form onSubmit={handleSubmit} className="auth-form">
        <div className="form-group">
          <label htmlFor="email" className="form-label">Email Address</label>
          <input type="email" id="email" name="email" value={formData.email} onChange={handleChange}
            placeholder="Enter your email" className={`form-input ${errors.email ? 'input-error' : ''}`} required />
          {errors.email && <small className="error-text">{errors.email}</small>}
        </div>

        <div className="form-group">
          <label htmlFor="password" className="form-label">Password</label>
          <input type="password" id="password" name="password" value={formData.password} onChange={handleChange}
            placeholder="Enter your password" className={`form-input ${errors.password ? 'input-error' : ''}`} required />
          {errors.password && <small className="error-text">{errors.password}</small>}
        </div>

        <div className="form-options">
          <label className="checkbox-label">
            <input type="checkbox" /><span>Remember me</span>
          </label>
          <Link to="/forgot-password" className="forgot-link">Forgot Password?</Link>
        </div>

        <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <p className="auth-footer">
        Don&apos;t have an account? <Link to="/register">Sign Up</Link>
      </p>
    </div>
  );
};

export default Login;
