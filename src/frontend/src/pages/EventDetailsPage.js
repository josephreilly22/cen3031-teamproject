import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import '../styles/EventDetailsPage.css';
import '../styles/DashboardPage.css';
import SignedInNavbar from '../components/SignedInNavbar';
import { getAuthSession } from '../utils/authSession';

function EventDetailsPage() {
  const navigate = useNavigate();
  const { eventId } = useParams();
  const session = getAuthSession();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!session.signedIn) {
      navigate('/login');
      return;
    }

    if (!session.onboardingComplete) {
      navigate('/onboarding');
      return;
    }

    fetch(`http://localhost:8000/events/${encodeURIComponent(eventId)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setEvent(data.event || null);
        } else {
          setError(data.message || 'Event not found.');
        }
      })
      .catch(() => setError('Could not connect to server.'))
      .finally(() => setLoading(false));
  }, [eventId, navigate, session.onboardingComplete, session.signedIn]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';

    const parsed = new Date(dateStr);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    }

    const dateOnly = new Date(`${dateStr}T00:00:00`);
    if (!Number.isNaN(dateOnly.getTime())) {
      return dateOnly.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }

    return dateStr;
  };

  const isEventLive = (start, end) => {
    const now = new Date();
    const startTime = start ? new Date(start) : null;
    const endTime = end ? new Date(end) : null;

    return Boolean(
      startTime &&
      !Number.isNaN(startTime.getTime()) &&
      startTime <= now &&
      (!endTime || Number.isNaN(endTime.getTime()) || endTime >= now)
    );
  };

  const formatLocationTypes = (types) => {
    if (!Array.isArray(types) || types.length === 0) {
      return '';
    }

    const labels = [];
    if (types.includes('on-campus')) labels.push('On-Campus');
    if (types.includes('off-campus')) labels.push('Off-Campus');
    return labels.join(', ');
  };

  if (!session.signedIn || !session.onboardingComplete) {
    return null;
  }

  const live = event ? isEventLive(event.date, event.end_date) : false;
  const campusLabel = event ? formatLocationTypes(event.location_types) : '';
  const canEditEvent = Boolean(
    event && (session.role === 'admin' || event.owner_email === session.email)
  );

  return (
    <div className="event-details-page">
      <SignedInNavbar title="Event" actionLabel="Dashboard" actionPath="/dashboard" />

      <main className="event-details-content">
        <button type="button" className="event-back-btn" onClick={() => navigate('/dashboard')}>
          {'\u2190'} Back
        </button>

        {loading ? (
          <p className="event-details-status">Loading event...</p>
        ) : error ? (
          <div className="event-details-empty">
            <span className="event-details-empty-icon">💤</span>
            <p>{error}</p>
          </div>
        ) : event ? (
          <>
            <section className="event-details-hero">
              <div className="event-details-title-row">
                <h1 className="dashboard-welcome-title event-details-title">{event.title}</h1>
                {live && (
                  <span className="event-live event-details-live event-details-live-title">
                    <span className="event-live-dot" aria-hidden="true" />
                    LIVE
                  </span>
                )}
              </div>
              {campusLabel && (
                <div className="event-details-campus-tags event-details-campus-tags-hero">
                  {campusLabel.split(', ').map((label) => (
                    <span key={label} className="event-details-campus-tag">{label}</span>
                  ))}
                </div>
              )}
            </section>

            <section className="event-details-board">
              <div className="event-details-main-card">
                <div className="event-details-section">
                  <p className="event-details-section-label">Description</p>
                  <p className="event-details-description">{event.description}</p>
                </div>
              </div>

              <aside className="event-details-side-card">
                <div className="event-details-meta-block">
                  <p className="event-details-section-label">Location</p>
                  <p className="event-details-location">
                    {'\u{1F4CD}'} {event.location || 'Location not listed'}
                  </p>
                </div>

                <div className="event-details-meta-block">
                  <p className="event-details-section-label">Organizer</p>
                  <p className="event-details-meta-value">{event.host}</p>
                </div>

                <div className="event-details-meta-block">
                  <p className="event-details-section-label">Starts</p>
                  <p className="event-details-meta-value event-details-meta-value-live">
                    {formatDate(event.date)}
                    {live && (
                      <span className="event-live event-details-live">
                        <span className="event-live-dot" aria-hidden="true" />
                        LIVE
                      </span>
                    )}
                  </p>
                </div>

                <div className="event-details-meta-block">
                  <p className="event-details-section-label">Ends</p>
                  <p className="event-details-meta-value">{formatDate(event.end_date || event.date)}</p>
                </div>

                {canEditEvent && (
                  <button
                    type="button"
                    className="event-details-edit-btn"
                    onClick={() => navigate(`/edit-event/${encodeURIComponent(event.id)}`)}
                  >
                    Edit Event
                  </button>
                )}
              </aside>
            </section>
          </>
        ) : null}
      </main>
    </div>
  );
}

export default EventDetailsPage;
