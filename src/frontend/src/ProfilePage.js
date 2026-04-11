import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './OnboardingPage.css';
import './ProfilePage.css';
import './SignupPage.css';
import SignedInNavbar from './SignedInNavbar';
import { getAuthSession, clearAuthSession, setAuthSession, setUserName } from './authSession';

function ProfilePage() {
  const navigate = useNavigate();
  const session = getAuthSession();

  const [firstName, setFirstName] = useState(session.firstName || '');
  const [lastName, setLastName] = useState(session.lastName || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [interests, setInterests] = useState('');
  const [eventType, setEventType] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!session.signedIn) {
      navigate('/login');
      return;
    }

    fetch(`http://localhost:8000/profile?email=${encodeURIComponent(session.email)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setFirstName(data.first_name || session.firstName || '');
          setLastName(data.last_name || session.lastName || '');
          setInterests(data.interests || '');
          setEventType(data.event_type || null);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [navigate, session.email, session.firstName, session.lastName, session.signedIn]);

  if (!session.signedIn) return null;

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      setError('First name and last name are required.');
      return;
    }

    if (!eventType) {
      setError('Please select an event preference.');
      return;
    }

    if (password && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setError('');

    try {
      const res = await fetch('http://localhost:8000/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: session.email,
          first_name: firstName,
          last_name: lastName,
          interests,
          event_type: eventType,
          password,
          confirm_password: confirmPassword,
        }),
      });
      const data = await res.json();

      if (data.success) {
        setUserName(firstName.trim(), lastName.trim());

        if (password) {
          setAuthSession(session.email, password);
          setPassword('');
          setConfirmPassword('');
        }

        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      } else {
        setError(data.message || 'Failed to save.');
      }
    } catch {
      setError('Could not connect to server.');
    }
  };

  const handleDeleteAccount = async () => {
    try {
      const res = await fetch(`http://localhost:8000/account?email=${encodeURIComponent(session.email)}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (data.success) {
        clearAuthSession();
        navigate('/');
      } else {
        setError(data.message || 'Failed to delete account.');
        setConfirmDelete(false);
      }
    } catch {
      setError('Could not connect to server.');
      setConfirmDelete(false);
    }
  };

  return (
    <div className="onboarding">
      <SignedInNavbar title="Profile" actionLabel="Dashboard" actionPath="/dashboard" />

      <main className="onboarding-content">
        <div className="onboarding-header">
          <h1 className="onboarding-heading">Profile</h1>
          <p className="onboarding-sub">
            Manage your preferences. These help us recommend events that match what
            you&apos;re actually looking for.
          </p>
          {!loading && (
            <div className="profile-header-actions">
              {error && <p className="signup-error profile-error-banner">⚠ {error}</p>}
              <button className="save-btn" onClick={handleSave}>
                {saved ? '✓ Saved!' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="profile-loading">Loading your profile...</div>
        ) : (
          <>
            <div className="onboarding-card profile-account-card">
              <div className="card-label-row">
                <span className="card-icon-bubble icon-yellow" aria-hidden="true">✏️</span>
                <h2 className="card-section-title">Account Details</h2>
              </div>
              <p className="card-section-sub">
                Want to update the name or password tied to your account?
              </p>
              <div className="signup-form profile-edit-form">
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="profileFirstName">First Name</label>
                    <input
                      type="text"
                      id="profileFirstName"
                      placeholder="John"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="profileLastName">Last Name</label>
                    <input
                      type="text"
                      id="profileLastName"
                      placeholder="Doe"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="profilePassword">Password</label>
                  <input
                    type="password"
                    id="profilePassword"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                {password && (
                  <div className="form-group">
                    <label htmlFor="profileConfirmPassword">Confirm Password</label>
                    <input
                      type="password"
                      id="profileConfirmPassword"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="onboarding-card">
              <div className="card-label-row">
                <span className="card-icon-bubble icon-blue" aria-hidden="true">✨</span>
                <h2 className="card-section-title">Your Interests</h2>
              </div>
              <p className="card-section-sub">
                What topics, activities, or themes get you excited?
              </p>
              <textarea
                className="interests-input"
                placeholder="e.g. live music, hackathons, cooking, film screenings..."
                value={interests}
                onChange={(e) => setInterests(e.target.value.slice(0, 256))}
                rows={4}
                maxLength={256}
              />
              <p className="interests-char-count">{interests.length} / 256</p>
            </div>

            <div className="onboarding-card">
              <div className="card-label-row">
                <span className="card-icon-bubble icon-pink" aria-hidden="true">📍</span>
                <h2 className="card-section-title">Event Preferences</h2>
              </div>
              <p className="card-section-sub">
                What kind of events are you looking for?
              </p>
              <div className="event-type-buttons">
                {['on-campus', 'off-campus', 'both'].map((type) => (
                  <button
                    key={type}
                    className={`event-type-btn ${eventType === type ? 'active' : ''}`}
                    onClick={() => setEventType(type)}
                  >
                    {type === 'on-campus' ? 'On-Campus' : type === 'off-campus' ? 'Off-Campus' : 'Both'}
                  </button>
                ))}
              </div>
            </div>

            <div className="onboarding-card event-leader-card">
              <div className="card-label-row">
                <span className="card-icon-bubble icon-green" aria-hidden="true">🎯</span>
                <h2 className="card-section-title">Become an Event Leader</h2>
              </div>
              <p className="card-section-sub">
                Do you run clubs, organize meetups, or want to host events for your community?
                Register as an event leader to get access to hosting tools, verified visibility,
                and a dedicated organizer dashboard.
              </p>
              <button className="event-leader-btn" onClick={() => navigate('/hostregistration')}>
                Register as an Event Leader →
              </button>
            </div>

            <div className="onboarding-card delete-account-card">
              <div className="card-label-row">
                <span className="card-icon-bubble icon-red" aria-hidden="true">⚠️</span>
                <h2 className="card-section-title">Danger Zone</h2>
              </div>
              <p className="card-section-sub delete-card-sub">
                Permanently delete your account and all associated data. This cannot be undone.
              </p>
              {!confirmDelete ? (
                <button className="delete-btn" onClick={() => setConfirmDelete(true)}>
                  Delete Account
                </button>
              ) : (
                <div className="delete-confirm-row">
                  <span className="delete-confirm-text">Are you sure? This is permanent.</span>
                  <button className="delete-btn" onClick={handleDeleteAccount}>Yes, delete</button>
                  <button className="delete-cancel-btn" onClick={() => setConfirmDelete(false)}>Cancel</button>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default ProfilePage;
