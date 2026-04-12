import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/LoginPage.css';
import { getAuthSession, setAuthSession, setOnboardingState, setUserRole, setUserName } from '../utils/authSession';
import { normalizeEmailInput } from '../utils/textInput';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function LoginPage() {
  const navigate = useNavigate();
  const existingSession = getAuthSession();
  const [email, setEmail] = useState(existingSession.email);
  const [password, setPassword] = useState(existingSession.password);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (existingSession.signedIn) {
      navigate('/dashboard');
    }
  }, [existingSession.signedIn, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Email and password are required');
      return;
    }

    if (!EMAIL_PATTERN.test(email.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('http://localhost:8000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.success) {
        setAuthSession(email, password);
        setUserRole(data.user?.role || 'user');
        setUserName(data.user?.first_name || '', data.user?.last_name || '');
        setOnboardingState(Boolean(data.user?.onboarding_complete));
        navigate(data.redirect || (data.user?.onboarding_complete ? '/dashboard' : '/onboarding'));
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (err) {
      setError('Could not connect to server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <button className="back-btn" onClick={() => navigate('/')}>← Back</button>
        <div className="login-logo">
          <img src="/logo.png" alt="Event Planner" className="login-logo-icon" />
          <span className="login-logo-text">Event Planners</span>
        </div>
        <h2 className="login-heading">Welcome back</h2>
        <p className="login-sub">Sign in to your account</p>

        {error && <p className="login-error">⚠ {error}</p>}

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="text"
              id="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(normalizeEmailInput(e.target.value))}
            />
          </div>
          <div className="form-group">
            <div className="password-label-row">
              <label htmlFor="password">Password</label>
            </div>
            <input
              type="password"
              id="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="login-footer">
          Don&apos;t have an account?{' '}
          <span className="login-link" onClick={() => navigate('/signup')}>Sign up</span>
        </p>
      </div>
    </div>
  );
}

export default LoginPage;


