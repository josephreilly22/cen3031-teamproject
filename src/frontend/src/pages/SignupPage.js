import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/SignupPage.css';
import { setAuthSession, setOnboardingState, setUserRole, setUserName } from '../utils/authSession';
import { applyCharacterLimit, normalizeEmailInput } from '../utils/textInput';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_MAX_LENGTH = 64;
const PASSWORD_MAX_LENGTH = 256;

function SignupPage() {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleNameChange = (setter, value) => {
    const nextValue = applyCharacterLimit(value, NAME_MAX_LENGTH);
    if (nextValue !== null) {
      setter(nextValue);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password || !confirmPassword) {
      setError('Please fill out all required fields');
      return;
    }

    if (!EMAIL_PATTERN.test(email.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (!agreedToTerms) {
      setError('You must agree to the Terms and Conditions');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('http://localhost:8000/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          email,
          password,
          confirm_password: confirmPassword,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAuthSession(email, password);
        setUserRole(data.user?.role || 'user');
        setUserName(data.user?.first_name || firstName, data.user?.last_name || lastName);
        setOnboardingState(Boolean(data.user?.onboarding_complete));
        navigate(data.redirect || '/onboarding');
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
        <button className="back-btn" onClick={() => navigate('/')}>← Back</button>
        <div className="signup-logo">
          <img src="/logo.png" alt="EventPlanner8" className="signup-logo-icon" />
          <span className="signup-logo-text">EventPlanner8</span>
        </div>
        <h2 className="signup-heading">Create an account</h2>
        <p className="signup-sub">Join the community today</p>

        {error && <p className="signup-error">⚠ {error}</p>}

        <form className="signup-form" onSubmit={handleSubmit} noValidate>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="firstName">First Name</label>
              <input
                type="text"
                id="firstName"
                placeholder="John"
                value={firstName}
                onChange={(e) => handleNameChange(setFirstName, e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="lastName">Last Name</label>
              <input
                type="text"
                id="lastName"
                placeholder="Doe"
                value={lastName}
                onChange={(e) => handleNameChange(setLastName, e.target.value)}
              />
            </div>
          </div>

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
              {password && (
                <button
                  type="button"
                  className="password-inline-action"
                  onClick={() => setShowPassword((current) => !current)}
                >
                  {showPassword ? 'Hide password' : 'Show password'}
                </button>
              )}
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value.slice(0, PASSWORD_MAX_LENGTH))}
            />
          </div>

          <div className="form-group">
            <div className="password-label-row">
              <label htmlFor="confirmPassword">Confirm Password</label>
              {confirmPassword && (
                <button
                  type="button"
                  className="password-inline-action"
                  onClick={() => setShowConfirmPassword((current) => !current)}
                >
                  {showConfirmPassword ? 'Hide password' : 'Show password'}
                </button>
              )}
            </div>
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              id="confirmPassword"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value.slice(0, PASSWORD_MAX_LENGTH))}
            />
          </div>

          <div className="terms-row">
            <label className="terms-checkbox" htmlFor="terms">
              <input
                type="checkbox"
                id="terms"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
              />
              <span className="terms-checkbox-box" aria-hidden="true">
                <span className="terms-checkbox-check" />
              </span>
              <span className="terms-checkbox-text">
                I agree to the Terms and Conditions
              </span>
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


