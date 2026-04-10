import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './LoginPage.css';
import { getAuthSession, setAuthSession, setUserRole, setUserName } from './authSession';

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
        setUserRole(data.user?.role || 'normal');
        setUserName(data.user?.first_name || '', data.user?.last_name || '');
        const session = getAuthSession();
        navigate(session.onboardingComplete ? '/dashboard' : '/onboarding');
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

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
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
              required
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
