import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './SignupPage.css';

function SignupPage() {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8000/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: `${firstName} ${lastName}`.trim(),
          email,
          password,
          confirm_password: confirmPassword,
        }),
      });
      const data = await res.json();
      if (data.success) {
        navigate(data.redirect || '/dashboard');
      } else {
        setError(data.message || 'Signup failed');
      }
    } catch (err) {
      setError('Could not connect to server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-page">
      <div className="signup-card">
        <button className="back-btn" onClick={() => navigate('/login')}>← Back</button>
        <div className="signup-logo">
          <img src={require('./assets/EventPlannerIcon.png')} alt="Event Planner" className="signup-logo-icon" />
          <span className="signup-logo-text">Event Planners</span>
        </div>
        <h2 className="signup-heading">Create an account</h2>
        <p className="signup-sub">Join the community today</p>

        {error && <p className="signup-error">{error}</p>}

        <form className="signup-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="firstName">First Name</label>
              <input
                type="text"
                id="firstName"
                placeholder="John"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="lastName">Last Name</label>
              <input
                type="text"
                id="lastName"
                placeholder="Doe"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
          </div>

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
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <div className="terms-row">
            <input type="checkbox" id="terms" required />
            <label htmlFor="terms">
              I agree to the <span className="terms-link">Terms and Conditions</span>
            </label>
          </div>

          <button type="submit" className="signup-btn" disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="signup-footer">
          Already have an account?{' '}
          <span className="signup-link" onClick={() => navigate('/login')}>Sign in</span>
        </p>
      </div>
    </div>
  );
}

export default SignupPage;
