import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/OnboardingPage.css';
import '../styles/ProfilePage.css';
import '../styles/SignupPage.css';
import SignedInNavbar from '../components/SignedInNavbar';
import { getAuthSession, setOnboardingState } from '../utils/authSession';
import { applyCharacterLimit, getEffectiveCharacterCount } from '../utils/textInput';

function OnboardingPage() {
  const navigate = useNavigate();
  const session = getAuthSession();
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
  const [interests, setInterests] = useState('');
  const [eventType, setEventType] = useState([]);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const hasUnsavedChanges = interests !== '' || eventType.length > 0;

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

    if (session.onboardingComplete) {
      navigate('/dashboard');
    }
  }, [navigate, session.onboardingComplete, session.signedIn]);

  if (!session.signedIn || session.onboardingComplete) {
    return null;
  }

  const handleSave = async () => {
    if (!eventType.length) {
      setError('Please select an event preference.');
      return;
    }

    setError('');
    const nextInterests = normalizeInterestsInput(interests);
    let data;

    try {
      const res = await fetch('http://localhost:8000/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: session.email,
          first_name: session.firstName,
          last_name: session.lastName,
          interests: nextInterests,
          event_type: eventType,
          password: '',
          confirm_password: '',
          onboarding_complete: true,
        }),
      });
      data = await res.json();

      if (!data.success) {
        setError(data.message || 'Failed to save.');
        return;
      }
    } catch {
      setError('Could not connect to server.');
      return;
    }

    setOnboardingState(Boolean(data.user?.onboarding_complete));
    setSaved(true);
    setTimeout(() => navigate('/dashboard'), 1000);
  };

  const confirmLeaveOnboarding = () => {
    if (!hasUnsavedChanges || saved) {
      return true;
    }

    return window.confirm('You have unsaved onboarding changes. Leave without saving?');
  };

  return (
    <div className="onboarding">
      <SignedInNavbar title="Onboarding" />

      <main className="onboarding-content">
        <div className="onboarding-header">
          <h1 className="onboarding-heading">Onboarding</h1>
          <p className="onboarding-sub">
            Help us personalize your experience. Tell us what you&apos;re into and where
            you like to explore, we&apos;ll use it to surface events that are actually
            worth your time.
          </p>
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
            className="interests-input"
            placeholder="e.g. live music, hackathons, cooking, film screenings, community volunteering..."
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
            onClick={() => {
              if (confirmLeaveOnboarding()) {
                navigate('/host-registeration', { state: { from: 'onboarding' } });
              }
            }}
          >
            Register as an Event Leader →
          </button>
        </div>

        {error && <p className="signup-error onboarding-error-banner">⚠ {error}</p>}

        <div className="onboarding-actions">
          <button className="save-btn" onClick={handleSave}>
            {saved ? '✓ Saved!' : 'Save Preferences'}
          </button>
        </div>
      </main>
    </div>
  );
}

export default OnboardingPage;


