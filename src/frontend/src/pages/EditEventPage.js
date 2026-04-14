import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import '../styles/CreateEventPage.css';
import LoggedInNavbar from '../components/LoggedInNavbar';
import { getAuthSession } from '../utils/authSession';
import { applyCharacterLimit, getEffectiveCharacterCount } from '../utils/textInput';

function EditEventPage() {
  const navigate = useNavigate();
  const { eventId } = useParams();
  const session = getAuthSession();
  const normalizeTitleInput = (value) => value.replace(/[\r\n]+/g, ' ');
  const normalizeDescriptionInput = (value) => value.replace(/\s+$/, '');
  const TITLE_MAX_LENGTH = 32;
  const HOST_MAX_LENGTH = 64;
  const LOCATION_MAX_LENGTH = 128;
  const DESCRIPTION_MAX_LENGTH = 1024;
  const [coordinates, setCoordinates] = useState(null);
  const [coordinatesLoading, setCoordinatesLoading] = useState(false);
  const [coordinatesError, setCoordinatesError] = useState('');
  const getMinDateTime = () => {
    const now = new Date();
    const pad = (value) => String(value).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  };
  const getEndMinDateTime = () => form.date || getMinDateTime();

  const [form, setForm] = useState({
    title: '',
    host: session.fullName || session.email,
    date: '',
    end_date: '',
    location: '',
    location_types: [],
    description: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [initialForm, setInitialForm] = useState(null);
  const [startTouched, setStartTouched] = useState(false);
  const [endTouched, setEndTouched] = useState(false);

  const normalizeDateTime = (value) => {
    if (!value) return '';

    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      const pad = (num) => String(num).padStart(2, '0');
      const year = parsed.getFullYear();
      const month = pad(parsed.getMonth() + 1);
      const day = pad(parsed.getDate());
      const hours = pad(parsed.getHours());
      const minutes = pad(parsed.getMinutes());
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    }

    return value.slice(0, 16);
  };

  const plusOneHour = (value) => {
    if (!value) return '';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '';
    parsed.setHours(parsed.getHours() + 1);
    return normalizeDateTime(parsed.toISOString());
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

  useEffect(() => {
    if (!session.signedIn) {
      navigate('/login');
      return;
    }
    if (session.role !== 'hoster' && session.role !== 'admin') {
      navigate('/dashboard');
      return;
    }

    fetch(`http://localhost:8000/events/${encodeURIComponent(eventId)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          const event = data.event;
          if (event.owner_email !== session.email && session.role !== 'admin') {
            setError('You can only edit your own events.');
            return;
          }

          setForm({
            title: event.title || '',
            host: event.host || session.fullName || session.email,
            date: normalizeDateTime(event.date),
            end_date: normalizeDateTime(event.end_date || plusOneHour(event.date)),
            location: event.location || '',
            location_types: Array.isArray(event.location_types) ? event.location_types : [],
            description: event.description || '',
          });
          setCoordinates(Array.isArray(event.coordinates) ? event.coordinates : null);
          setInitialForm({
            title: event.title || '',
            host: event.host || session.fullName || session.email,
            date: normalizeDateTime(event.date),
            end_date: normalizeDateTime(event.end_date || plusOneHour(event.date)),
            location: event.location || '',
            location_types: Array.isArray(event.location_types) ? event.location_types : [],
            description: event.description || '',
          });
          setLoaded(true);
        } else {
          setError(data.message || 'Event not found.');
        }
      })
      .catch(() => setError('Could not connect to server.'))
      .finally(() => setLoading(false));
  }, [eventId, navigate, session.email, session.fullName, session.role, session.signedIn]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'date') {
      setStartTouched(true);
    }

    if (name === 'end_date') {
      setEndTouched(true);
    }

    if (name === 'title') {
      const nextValue = applyCharacterLimit(normalizeTitleInput(value), TITLE_MAX_LENGTH);
      if (nextValue !== null) {
        setForm({ ...form, title: nextValue });
      }
      return;
    }

    if (name === 'host') {
      const nextValue = applyCharacterLimit(value, HOST_MAX_LENGTH);
      if (nextValue !== null) {
        setForm({ ...form, host: nextValue });
      }
      return;
    }

    if (name === 'location') {
      const nextValue = applyCharacterLimit(value, LOCATION_MAX_LENGTH);
      if (nextValue !== null) {
        setForm({ ...form, location: nextValue });
      }
      return;
    }

    if (name === 'description') {
      const nextValue = applyCharacterLimit(value, DESCRIPTION_MAX_LENGTH, { multiline: true });
      if (nextValue !== null) {
        setForm({ ...form, description: nextValue });
      }
      return;
    }

    setForm({ ...form, [name]: value });
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

  const hasUnsavedChanges = Boolean(
    initialForm && (
      form.title !== initialForm.title ||
      form.host !== initialForm.host ||
      form.date !== initialForm.date ||
      form.end_date !== initialForm.end_date ||
      form.location !== initialForm.location ||
      JSON.stringify(form.location_types) !== JSON.stringify(initialForm.location_types) ||
      form.description !== initialForm.description
    )
  );
  const showDateReset = Boolean(
    initialForm && (form.date !== initialForm.date || form.end_date !== initialForm.end_date)
  );

  const isCurrentMinuteOrLater = (value) => {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return false;

    const now = new Date();
    now.setSeconds(0, 0);
    return parsed >= now;
  };

  const handleResetDates = () => {
    if (!initialForm) {
      return;
    }

    setStartTouched(false);
    setEndTouched(false);
    setForm((previousForm) => ({
      ...previousForm,
      date: initialForm.date,
      end_date: initialForm.end_date,
    }));
  };

  const confirmLeave = () => {
    if (!hasUnsavedChanges) {
      return true;
    }

    return window.confirm('You have unsaved event changes. Leave without saving?');
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const normalizedTitle = normalizeTitleInput(form.title).trim();
    const normalizedDescription = normalizeDescriptionInput(form.description);

    if (!normalizedTitle || !form.host.trim() || !form.date.trim() || !form.location.trim() || !normalizedDescription.trim()) {
      setError('Please fill out all required fields.');
      return;
    }

    if (!form.end_date.trim()) {
      setError('Please fill out all required fields.');
      return;
    }

    if (!form.location_types.length) {
      setError('Select at least one event location type.');
      return;
    }

    if (initialForm && form.date !== initialForm.date && !isCurrentMinuteOrLater(form.date)) {
      setError('Event date and time cannot be in the past.');
      return;
    }

    if (new Date(form.end_date) < new Date(form.date)) {
      setError('End date and time cannot be before the start.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`http://localhost:8000/events/${encodeURIComponent(eventId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner_email: session.email,
          title: normalizedTitle,
          host: form.host,
          date: form.date,
          end_date: form.end_date,
          location: form.location,
          location_types: form.location_types,
          description: normalizedDescription,
          coordinates,
        }),
      });
      const data = await res.json();
      if (data.success) {
        navigate('/my-events');
      } else {
        setError(data.message || 'Failed to update event.');
      }
    } catch {
      setError('Could not connect to server.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this event? This cannot be undone.')) {
      return;
    }

    setError('');
    setSaving(true);
    try {
      const res = await fetch(
        `http://localhost:8000/events/${encodeURIComponent(eventId)}?owner_email=${encodeURIComponent(session.email)}`,
        { method: 'DELETE' }
      );
      const data = await res.json();
      if (data.success) {
        navigate('/my-events');
      } else {
        setError(data.message || 'Failed to delete event.');
      }
    } catch {
      setError('Could not connect to server.');
    } finally {
      setSaving(false);
    }
  };

  if (!session.signedIn || (session.role !== 'hoster' && session.role !== 'admin')) return null;

  return (
    <div className="create-event-page">
      <LoggedInNavbar
        title="Edit Event"
        actionLabel="Dashboard"
        actionPath="/dashboard"
        onBeforeNavigate={confirmLeave}
        onBeforeLogout={confirmLeave}
      />

      <main className="create-event-content">
        <div className="create-event-header">
          <h1 className="create-event-heading">Edit Event</h1>
          <p className="create-event-sub">
            Update the details for this event and keep everything current for your audience.
          </p>
        </div>

        {loading ? (
          <p className="ce-loading">Loading event...</p>
        ) : loaded ? (
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
                min={getMinDateTime()}
                value={form.date}
                onChange={handleChange}
                required
              />
            </div>

            {form.date && (
              <div className="ce-field">
                <label>End Date and Time</label>
                <input
                  type="datetime-local"
                  name="end_date"
                  className={!endTouched ? 'ce-input-placeholder-state' : ''}
                  min={getEndMinDateTime()}
                  value={form.end_date}
                  onChange={handleChange}
                  required
                />
              </div>
            )}

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
              {coordinatesError && <p className="ce-field-hint">{coordinatesError}</p>}
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
              <button type="submit" className="ce-btn-primary" disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes →'}
              </button>
              <button type="button" className="ce-btn-secondary" onClick={() => { if (confirmLeave()) navigate('/my-events'); }}>
                Cancel
              </button>
              <button type="button" className="ce-btn-danger ce-btn-danger-right" onClick={handleDelete} disabled={saving}>
                Delete
              </button>
            </div>
          </form>
        ) : (
          error && <p className="ce-error">{error}</p>
        )}
      </main>
    </div>
  );
}

export default EditEventPage;


