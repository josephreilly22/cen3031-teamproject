import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/CreateEventPage.css';
import SignedInNavbar from '../components/SignedInNavbar';
import { getAuthSession } from '../utils/authSession';
import { applyCharacterLimit, getEffectiveCharacterCount } from '../utils/textInput';

function CreateEventPage() {
  const navigate = useNavigate();
  const session = getAuthSession();
  const [hostDefault, setHostDefault] = useState(session.fullName || session.email);
  const normalizeTitleInput = (value) => value.replace(/[\r\n]+/g, ' ');
  const normalizeDescriptionInput = (value) => value.replace(/\s+$/, '');
  const TITLE_MAX_LENGTH = 32;
  const HOST_MAX_LENGTH = 64;
  const LOCATION_MAX_LENGTH = 128;
  const DESCRIPTION_MAX_LENGTH = 1024;
  const [coordinates, setCoordinates] = useState(null);
  const [coordinatesLoading, setCoordinatesLoading] = useState(false);
  const [coordinatesError, setCoordinatesError] = useState('');
  const formatDateTimeLocal = (date) => {
    const pad = (value) => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  const getCurrentDateTime = () => formatDateTimeLocal(new Date());
  const addOneHour = (dateTime) => {
    const parsed = new Date(dateTime);
    if (Number.isNaN(parsed.getTime())) return dateTime;
    parsed.setHours(parsed.getHours() + 1);
    return formatDateTimeLocal(parsed);
  };
  const formatCoordinates = (value) => {
    if (!value || !Array.isArray(value) || value.length !== 2) {
      return 'Not set';
    }

    return `${value[0]}, ${value[1]}`;
  };

  const handleGetCoordinates = () => {
    if (!navigator.geolocation) {
      setCoordinatesError('Location access is not supported in this browser.');
      return;
    }

    setCoordinatesError('');
    setCoordinatesLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoordinates([
          Number(position.coords.latitude.toFixed(6)),
          Number(position.coords.longitude.toFixed(6)),
        ]);
        setCoordinatesLoading(false);
      },
      () => {
        setCoordinatesError('Location permission was denied or unavailable.');
        setCoordinatesLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  };

  const [currentMinDateTime, setCurrentMinDateTime] = useState(getCurrentDateTime);

  const [form, setForm] = useState({
    title: '',
    host: hostDefault,
    date: '',
    end_date: '',
    location: '',
    location_types: [],
    description: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [startTouched, setStartTouched] = useState(false);
  const [endTouched, setEndTouched] = useState(false);
  const [hostTouched, setHostTouched] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (!session.signedIn || !session.email) {
      return () => {};
    }

    fetch(`http://localhost:8000/profile?email=${encodeURIComponent(session.email)}`)
      .then((response) => response.json())
      .then((data) => {
        if (cancelled || !data.success) {
          return;
        }

        const fallbackName = [data.first_name, data.last_name].filter(Boolean).join(' ').trim();
        const nextHost = data.organization?.trim() || fallbackName || session.fullName || session.email;
        setHostDefault(nextHost);
        setForm((previousForm) => ({
          ...previousForm,
          host: hostTouched ? previousForm.host : nextHost,
        }));
      })
      .catch(() => {});

    const intervalId = window.setInterval(() => {
      setCurrentMinDateTime(getCurrentDateTime());
    }, 30000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [hostTouched, session.email, session.fullName, session.signedIn]);

  const displayedStartDate = startTouched ? form.date : currentMinDateTime;
  const displayedEndDate = endTouched ? form.end_date : addOneHour(displayedStartDate);
  const showDateReset = startTouched || endTouched;

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'date') {
      setStartTouched(true);
      setForm((previousForm) => ({
        ...previousForm,
        date: value,
        end_date: endTouched ? previousForm.end_date : '',
      }));
      return;
    }

    if (name === 'end_date') {
      setEndTouched(true);
      setForm((previousForm) => ({ ...previousForm, end_date: value }));
      return;
    }

    if (name === 'host') {
      setHostTouched(true);
      const nextValue = applyCharacterLimit(value, HOST_MAX_LENGTH);
      if (nextValue !== null) {
        setForm((previousForm) => ({ ...previousForm, host: nextValue }));
      }
      return;
    }

    if (name === 'title') {
      const nextValue = applyCharacterLimit(normalizeTitleInput(value), TITLE_MAX_LENGTH);
      if (nextValue !== null) {
        setForm((previousForm) => ({
          ...previousForm,
          title: nextValue,
        }));
      }
      return;
    }

    if (name === 'location') {
      const nextValue = applyCharacterLimit(value, LOCATION_MAX_LENGTH);
      if (nextValue !== null) {
        setForm((previousForm) => ({ ...previousForm, location: nextValue }));
      }
      return;
    }

    if (name === 'description') {
      const nextValue = applyCharacterLimit(value, DESCRIPTION_MAX_LENGTH, { multiline: true });
      if (nextValue !== null) {
        setForm((previousForm) => ({ ...previousForm, description: nextValue }));
      }
      return;
    }

    setForm((previousForm) => ({ ...previousForm, [name]: value }));
  };

  const toggleLocationType = (type) => {
    setForm((previousForm) => {
      const hasType = previousForm.location_types.includes(type);
      return {
        ...previousForm,
        location_types: hasType
          ? previousForm.location_types.filter((item) => item !== type)
          : [...previousForm.location_types, type],
      };
    });
  };

  const handleResetToToday = () => {
    setStartTouched(false);
    setEndTouched(false);
    setHostTouched(false);
    setCurrentMinDateTime(getCurrentDateTime());
    setForm((previousForm) => ({
      ...previousForm,
      date: '',
      end_date: '',
      location_types: [],
    }));
    setCoordinates(null);
    setCoordinatesError('');
  };

  const handleResetDates = () => {
    handleResetToToday();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const submitCurrentDateTime = getCurrentDateTime();
    const effectiveStartDate = startTouched ? form.date : submitCurrentDateTime;
    const effectiveEndDate = endTouched ? form.end_date : addOneHour(effectiveStartDate);
    const normalizedTitle = normalizeTitleInput(form.title).trim();
    const normalizedDescription = normalizeDescriptionInput(form.description);

    if (!normalizedTitle || !form.host.trim() || !effectiveStartDate.trim() || !form.location.trim() || !normalizedDescription.trim()) {
      setError('Please fill out all required fields.');
      return;
    }

    if (!effectiveEndDate.trim()) {
      setError('Please fill out all required fields.');
      return;
    }

    if (!form.location_types.length) {
      setError('Select at least one event location type.');
      return;
    }

    if (new Date(effectiveStartDate) < new Date(submitCurrentDateTime)) {
      setError('Event date and time cannot be in the past.');
      return;
    }

    if (new Date(effectiveEndDate) < new Date(effectiveStartDate)) {
      setError('End date and time cannot be before the start.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('http://localhost:8000/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            owner_email: session.email,
            title: normalizedTitle,
            host: form.host,
            date: effectiveStartDate,
            end_date: effectiveEndDate,
            location: form.location,
            location_types: form.location_types,
            description: normalizedDescription,
            coordinates,
          }),
        });
      const data = await res.json();
      if (data.success) {
        setSubmitted(true);
      } else {
        setError(data.message || 'Failed to create event.');
      }
    } catch {
      setError('Could not connect to server.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="create-event-page">
        <SignedInNavbar title="Create Event" actionLabel="Dashboard" actionPath="/dashboard" />
        <main className="create-event-content">
          <div className="create-event-success">
            <span className="create-event-success-icon">🎉</span>
            <h2>Event Created!</h2>
            <p><strong>{form.title}</strong> has been published and is now live.</p>
            <div className="create-event-success-actions">
              <button className="ce-btn-primary" onClick={() => navigate('/my-events')}>View My Events</button>
              <button
                className="ce-btn-secondary"
                onClick={() => {
                  const nextCurrentDateTime = getCurrentDateTime();
                  setCurrentMinDateTime(nextCurrentDateTime);
                  setSubmitted(false);
                  setStartTouched(false);
                  setEndTouched(false);
                  setHostTouched(false);
                  setForm({
                    title: '',
                    host: hostDefault,
                    date: '',
                    end_date: '',
                    location: '',
                    location_types: [],
                    description: '',
                  });
                  setCoordinates(null);
                  setCoordinatesError('');
                }}
              >
                Create Another
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="create-event-page">
      <SignedInNavbar title="Create Event" actionLabel="Dashboard" actionPath="/dashboard" />

      <main className="create-event-content">
        <div className="create-event-header">
          <h1 className="create-event-heading">Create Event</h1>
          <p className="create-event-sub">
          Every great event starts with a story. Fill in the details below and
          we'll match it with the right audience, putting your event in front
          of the people who'll actually show up.
          </p>
        </div>

        <form className="create-event-form" onSubmit={handleSubmit} noValidate>
          <div className="ce-field">
            <label>Event Title</label>
            <input
              type="text"
              name="title"
              placeholder="e.g. Spring Hackathon 2025"
              value={form.title}
              onChange={handleChange}
              maxLength={TITLE_MAX_LENGTH}
              onBlur={() => setForm((previousForm) => ({
                ...previousForm,
                title: normalizeTitleInput(previousForm.title).trim(),
              }))}
              required
            />
            <p className="ce-field-hint ce-field-counter">{getEffectiveCharacterCount(form.title)} / {TITLE_MAX_LENGTH} characters</p>
          </div>

          <div className="ce-field">
            <label>Host</label>
            <input
              type="text"
              name="host"
              placeholder="e.g. John Doe, Jane Doe, Gator Events Club"
              value={form.host}
              onChange={handleChange}
              maxLength={HOST_MAX_LENGTH}
              required
            />
          </div>

            <div className="ce-field">
              <div className="ce-label-row">
                <label>Start Date and Time</label>
                {showDateReset && (
                  <button type="button" className="ce-inline-action" onClick={handleResetDates}>
                    Reset to defaults
                  </button>
                )}
              </div>
            <input
              type="datetime-local"
              name="date"
              className={!startTouched ? 'ce-input-placeholder-state' : ''}
              min={currentMinDateTime}
              value={displayedStartDate}
              onChange={handleChange}
              required
            />
            {!startTouched && (
              <p className="ce-field-hint">Defaults to the current time until you choose a different start.</p>
            )}
          </div>

          <div className="ce-field">
            <label>End Date and Time</label>
            <input
              type="datetime-local"
              name="end_date"
              className={!endTouched ? 'ce-input-placeholder-state' : ''}
              min={displayedStartDate || currentMinDateTime}
              value={displayedEndDate}
              onChange={handleChange}
              required
            />
          </div>

          <div className="ce-field">
            <label>Location</label>
            <input
              type="text"
              name="location"
              placeholder="e.g. Reitz Union Room 2365, or Off-Campus address"
              value={form.location}
              onChange={handleChange}
              maxLength={LOCATION_MAX_LENGTH}
              required
            />
          </div>

          <div className="ce-field">
            <div className="ce-label-row">
              <label>Coordinates <span className="ce-label-note">(optional)</span></label>
              <button type="button" className="ce-inline-action" onClick={handleGetCoordinates} disabled={coordinatesLoading}>
                {coordinatesLoading ? 'Getting coordinates...' : 'Get Coordinates'}
              </button>
            </div>
            <input
              type="text"
              value={formatCoordinates(coordinates)}
              placeholder="-, -"
              readOnly
              className="ce-input-placeholder-state"
            />
            <p className="ce-field-hint">
              Optional. Uses your browser location and stores latitude, longitude for location-aware matching.
            </p>
            {coordinatesError && <p className="ce-field-hint ce-field-error-text">{coordinatesError}</p>}
          </div>

          <div className="ce-field">
            <label>Preferences</label>
            <div className="ce-toggle-row">
              <button
                type="button"
                className={`ce-toggle-btn ${form.location_types.includes('on-campus') ? 'active' : ''}`}
                onClick={() => toggleLocationType('on-campus')}
              >
                On-Campus
              </button>
              <button
                type="button"
                className={`ce-toggle-btn ${form.location_types.includes('off-campus') ? 'active' : ''}`}
                onClick={() => toggleLocationType('off-campus')}
              >
                Off-Campus
              </button>
            </div>
            {form.location_types.length === 0 && (
              <p className="ce-field-hint">Select all that apply for your event.</p>
            )}
          </div>

          <div className="ce-field">
            <label>Event Description</label>
            <textarea
              name="description"
              rows={5}
              placeholder="Tell people what to expect, the vibe, the agenda, who it's for, and why they shouldn't miss it."
              value={form.description}
              onChange={handleChange}
              onBlur={() => setForm((previousForm) => ({
                ...previousForm,
                description: normalizeDescriptionInput(previousForm.description),
              }))}
              maxLength={DESCRIPTION_MAX_LENGTH}
              required
            />
            <p className="ce-field-hint ce-field-counter">{getEffectiveCharacterCount(form.description, { multiline: true })} / {DESCRIPTION_MAX_LENGTH} characters</p>
          </div>

          {error && <p className="ce-error">{error}</p>}

          <div className="ce-actions">
            <button type="submit" className="ce-btn-primary" disabled={loading}>
              {loading ? 'Publishing...' : 'Publish Event →'}
            </button>
            <button type="button" className="ce-btn-secondary" onClick={() => navigate('/my-events')}>
              Cancel
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

export default CreateEventPage;
