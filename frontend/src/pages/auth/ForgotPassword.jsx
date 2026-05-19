import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import { validateEmail } from '../../utils/validation';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const { showNotification } = useNotification();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }
    setLoading(true);

    try {
      await authAPI.forgotPassword(email);
      setSent(true);
      showNotification('Password reset instructions sent to your email', 'success');
    } catch (error) {
      showNotification(error.response?.data?.message || 'Failed to send reset email', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="auth-form-container">
        <div className="success-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>
        <h1>Check Your Email</h1>
        <p className="auth-subtitle">
          We&apos;ve sent password reset instructions to <strong>{email}</strong>
        </p>
        <Link to="/login" className="btn btn-primary btn-block">
          Back to Login
        </Link>
      </div>
    );
  }

  return (
    <div className="auth-form-container">
      <h1>Forgot Password?</h1>
      <p className="auth-subtitle">
        Enter your email address and we&apos;ll send you instructions to reset your password.
      </p>

      <form onSubmit={handleSubmit} className="auth-form">
        <div className="form-group">
          <label htmlFor="email">Email Address</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(''); }}
            placeholder="Enter your email"
            autoComplete="email"
            required
          />
          {error && <div className="input-error" style={{ color: '#c62828', marginTop: '6px' }}>{error}</div>}
        </div>

        <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
          {loading ? 'Sending...' : 'Send Reset Link'}
        </button>
      </form>

      <p className="auth-footer">
        Remember your password? <Link to="/login">Sign In</Link>
      </p>
    </div>
  );
};

export default ForgotPassword;
