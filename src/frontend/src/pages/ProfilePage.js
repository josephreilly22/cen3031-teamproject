import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import '../styles/OnboardingPage.css';
import '../styles/ProfilePage.css';
import '../styles/SignupPage.css';
import SignedInNavbar from '../components/SignedInNavbar';
import { getAuthSession, clearAuthSession, setAuthSession, setOnboardingState, setUserName, setUserRole } from '../utils/authSession';
import { applyCharacterLimit, getEffectiveCharacterCount } from '../utils/textInput';

function ProfilePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const session = getAuthSession();
  const NAME_MAX_LENGTH = 64;
  const PASSWORD_MAX_LENGTH = 256;
  const INTERESTS_MAX_LENGTH = 256;
  const preferenceOptions = ['on-campus', 'off-campus'];
  const normalizeInterestsInput = (value) => value.replace(/\s+$/, '');
  const eventTypeToSelections = (value) => {
    if (!Array.isArray(value)) {
      return [];
    }

    return preferenceOptions.filter((option) => value.includes(option));
  };
  const selectionsToEventType = (selections) => {
    return preferenceOptions.filter((option) => selections.includes(option));
  };

  const [firstName, setFirstName] = useState(session.firstName || '');
  const [lastName, setLastName] = useState(session.lastName || '');
  const [role, setRole] = useState(session.role || 'user');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [interests, setInterests] = useState('');
  const [eventType, setEventType] = useState([]);
  const [initialProfile, setInitialProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const interestsRef = useRef(null);

  const handleInterestsChange = (value) => {
    const nextValue = applyCharacterLimit(value, INTERESTS_MAX_LENGTH, { multiline: true });
    if (nextValue !== null) {
      setInterests(nextValue);
    }
  };

  const toggleEventPreference = (type) => {
    const nextSelections = new Set(eventTypeToSelections(eventType));
    if (nextSelections.has(type)) {
      nextSelections.delete(type);
    } else {
      nextSelections.add(type);
    }

    setEventType(selectionsToEventType([...nextSelections]));
  };

  useEffect(() => {
    if (!session.signedIn) {
      navigate('/login');
      return;
    }

    if (!session.onboardingComplete) {
      navigate('/onboarding');
      return;
    }

    fetch(`http://localhost:8000/profile?email=${encodeURIComponent(session.email)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          if (!data.onboarding_complete) {
            navigate('/onboarding');
            return;
          }

          const profileState = {
            firstName: data.first_name || session.firstName || '',
            lastName: data.last_name || session.lastName || '',
            role: data.role || session.role || 'user',
            interests: normalizeInterestsInput(data.interests || ''),
            eventType: Array.isArray(data.event_type) ? data.event_type : [],
          };

          setFirstName(profileState.firstName);
          setLastName(profileState.lastName);
          setRole(profileState.role);
          setInterests(profileState.interests);
          setEventType(profileState.eventType);
          setUserRole(profileState.role);
          setInitialProfile(profileState);
          setOnboardingState(Boolean(data.onboarding_complete));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [navigate, session.email, session.firstName, session.lastName, session.onboardingComplete, session.signedIn]);

  useEffect(() => {
    if (loading) {
      return;
    }

    const params = new URLSearchParams(location.search);
    if (params.get('focus') !== 'interests') {
      return;
    }

    const centerInterestsField = () => {
      const node = interestsRef.current;
      if (!node) {
        return;
      }

      const navOffset = 120;
      const rect = node.getBoundingClientRect();
      const absoluteTop = window.scrollY + rect.top;
      const targetTop = Math.max(0, absoluteTop - ((window.innerHeight - rect.height) / 2) - navOffset);

      window.scrollTo({ top: targetTop, behavior: 'smooth' });
      node.focus({ preventScroll: true });
    };

    window.requestAnimationFrame(() => {
      centerInterestsField();
      window.setTimeout(centerInterestsField, 220);
    });
  }, [loading, location.search]);

  const hasUnsavedChanges = Boolean(
    initialProfile && (
      firstName !== initialProfile.firstName ||
      lastName !== initialProfile.lastName ||
      interests !== initialProfile.interests ||
      JSON.stringify(eventType) !== JSON.stringify(initialProfile.eventType) ||
      ((password || confirmPassword) && confirmPassword && (password !== '' || confirmPassword !== ''))
    )
  );

  const confirmLeave = () => {
    if (!hasUnsavedChanges) {
      return true;
    }

    return window.confirm('You have unsaved profile changes. Leave without saving?');
  };

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (!hasUnsavedChanges) {
        return;
      }

      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  if (!session.signedIn) return null;

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      setError('First name and last name are required.');
      return;
    }

    if (!eventType.length) {
      setError('Please select an event preference.');
      return;
    }

    if (password && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setError('');
    const nextInterests = normalizeInterestsInput(interests);

    try {
      const res = await fetch('http://localhost:8000/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: session.email,
          first_name: firstName,
          last_name: lastName,
          interests: nextInterests,
          event_type: [...eventType],
          password,
          confirm_password: confirmPassword,
        }),
      });
      const data = await res.json();

      if (data.success) {
        const nextProfile = {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          role,
          interests: nextInterests,
          eventType: [...eventType],
        };

        setUserName(firstName.trim(), lastName.trim());
        setUserRole(data.user?.role || role);
        setOnboardingState(Boolean(data.user?.onboarding_complete));
        setInterests(nextInterests);
        setInitialProfile(nextProfile);
        setRole(data.user?.role || role);

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

  const handleSignOut = () => {
    if (!confirmLeave()) {
      return;
    }

    clearAuthSession();
    navigate('/');
  };

  return (
    <div className="onboarding">
      <SignedInNavbar
        title="Profile"
        actionLabel="Dashboard"
        actionPath="/dashboard"
        onBeforeNavigate={confirmLeave}
        onBeforeLogout={confirmLeave}
      />

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
              {saved && <p className="profile-success-banner">✓ Changes have been saved.</p>}
              <div className="profile-action-buttons">
                <button className="save-btn" onClick={handleSave}>
                  Save Changes
                </button>
                <button className="profile-signout-btn" onClick={handleSignOut}>
                  Sign Out
                </button>
              </div>
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
                <div className="form-group">
                  <label htmlFor="profileRole">Role</label>
                  <input
                    type="text"
                    id="profileRole"
                    value={role}
                    disabled
                    className="locked-input"
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="profileFirstName">First Name</label>
                    <input
                      type="text"
                      id="profileFirstName"
                      placeholder="John"
                      value={firstName}
                      onChange={(e) => {
                        const nextValue = applyCharacterLimit(e.target.value, NAME_MAX_LENGTH);
                        if (nextValue !== null) {
                          setFirstName(nextValue);
                        }
                      }}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="profileLastName">Last Name</label>
                    <input
                      type="text"
                      id="profileLastName"
                      placeholder="Doe"
                      value={lastName}
                      onChange={(e) => {
                        const nextValue = applyCharacterLimit(e.target.value, NAME_MAX_LENGTH);
                        if (nextValue !== null) {
                          setLastName(nextValue);
                        }
                      }}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <div className="password-label-row">
                    <label htmlFor="profilePassword">Password</label>
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
                    id="profilePassword"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value.slice(0, PASSWORD_MAX_LENGTH))}
                  />
                </div>

                {password && (
                  <div className="form-group">
                    <div className="password-label-row">
                      <label htmlFor="profileConfirmPassword">Confirm Password</label>
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
                      id="profileConfirmPassword"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value.slice(0, PASSWORD_MAX_LENGTH))}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="onboarding-card">
              <div className="card-label-row">
                <span className="card-icon-bubble icon-blue" aria-hidden="true">✨</span>
                <h2 className="card-section-title">Your Interests <span className="section-title-note">(optional)</span></h2>
              </div>
              <p className="card-section-sub">
                What topics, activities, or themes get you excited? This helps power your AI-personalized event suggestions.
              </p>
              <textarea
                id="profileInterests"
                ref={interestsRef}
                className="interests-input"
                placeholder="e.g. live music, hackathons, cooking, film screenings..."
                value={interests}
                onChange={(e) => handleInterestsChange(e.target.value)}
                rows={4}
              />
              <p className="interests-char-count">{getEffectiveCharacterCount(interests, { multiline: true })} / {INTERESTS_MAX_LENGTH} characters</p>
            </div>

            <div className="onboarding-card">
              <div className="card-label-row">
                <span className="card-icon-bubble icon-pink" aria-hidden="true">📍</span>
                <h2 className="card-section-title">Event Preferences</h2>
              </div>
              <p className="card-section-sub">
                What kind of events are you looking for? Select all that apply.
              </p>
              <div className="event-type-buttons">
                {preferenceOptions.map((type) => (
                  <button
                    key={type}
                    className={`event-type-btn ${eventTypeToSelections(eventType).includes(type) ? 'active' : ''}`}
                    onClick={() => toggleEventPreference(type)}
                  >
                    {type === 'on-campus' ? 'On-Campus' : 'Off-Campus'}
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
              <button
                className="event-leader-btn"
                onClick={() => navigate('/host-registeration', { state: { from: 'profile' } })}
              >
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


