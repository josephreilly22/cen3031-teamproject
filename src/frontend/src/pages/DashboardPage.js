import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/DashboardPage.css';
import SignedInNavbar from '../components/SignedInNavbar';
import OverflowTitle from '../components/OverflowTitle';
import { getAuthSession } from '../utils/authSession';

function EventTile({ event }) {
  const navigate = useNavigate();
  const titleText = event.title || '';
  const formatCardDescription = (value) => {
    const normalized = (value || '').trim();
    if (!normalized) {
      return '';
    }

    const sentenceMatch = normalized.match(/^.*?[.!?](?=(?:\s|$))/s);
    return (sentenceMatch ? sentenceMatch[0] : normalized).trim();
  };

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

  const formatEventWindow = (start, end) => ({
    startLabel: formatDate(start),
    endLabel: formatDate(end),
  });

  const formatLocationTypes = (types) => {
    if (!Array.isArray(types) || types.length === 0) {
      return '';
    }

    const labels = [];
    if (types.includes('on-campus')) labels.push('On-Campus');
    if (types.includes('off-campus')) labels.push('Off-Campus');
    return labels.join(', ');
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

  const { startLabel, endLabel } = formatEventWindow(event.date, event.end_date);
  const live = isEventLive(event.date, event.end_date);
  const campusLabel = formatLocationTypes(event.location_types);
  const cardDescription = formatCardDescription(event.description);

  return (
    <div
      className="event-tile"
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/dashboard/${encodeURIComponent(event.id)}`)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          navigate(`/dashboard/${encodeURIComponent(event.id)}`);
        }
      }}
      aria-label={`Open ${event.title}`}
    >
      <div className="event-title-row">
        <OverflowTitle text={titleText} className="event-tile-title" />
        {live && (
          <span className="event-live">
            <span className="event-live-dot" aria-hidden="true" />
            LIVE
          </span>
        )}
      </div>
      {campusLabel && (
        <div className="event-campus-tags">
          {campusLabel.split(', ').map((label) => (
            <span key={label} className="event-campus-tag">{label}</span>
          ))}
        </div>
      )}
      {event.location && (
        <p className="event-location">
          {'\u{1F4CD}'} {event.location}
        </p>
      )}
      <div className="event-meta-group">
        <p className="event-tile-meta">{event.host}</p>
        {startLabel && (
          <p className="event-date">
            <span>Starts:</span> {startLabel}
          </p>
        )}
        {endLabel && (
          <p className="event-date">
            <span>Ends:</span> {endLabel}
          </p>
        )}
      </div>
      <p className="event-tile-desc">{cardDescription}</p>
    </div>
  );
}

function DashboardPage() {
  const navigate = useNavigate();
  const session = getAuthSession();
  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  useEffect(() => {
    if (!session.signedIn) {
      navigate('/login');
    } else if (!session.onboardingComplete) {
      navigate('/onboarding');
    }
  }, [navigate, session.signedIn, session.onboardingComplete]);

  useEffect(() => {
    if (!session.signedIn || !session.onboardingComplete) {
      return;
    }

    fetch('http://localhost:8000/events')
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          const sortedEvents = [...(data.events || [])].sort((a, b) => {
            const aTime = new Date(a.date || 0).getTime();
            const bTime = new Date(b.date || 0).getTime();
            return aTime - bTime;
          });
          setEvents(sortedEvents);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingEvents(false));
  }, [session.signedIn, session.onboardingComplete]);

  if (!session.signedIn || !session.onboardingComplete) {
    return null;
  }

  const displayName = session.fullName || session.firstName || 'User';
  const suggestedEvents = [];

  return (
    <div className="dashboard">
      <SignedInNavbar title="Dashboard" actionLabel="Dashboard" actionPath="/dashboard" />

      <main className="dashboard-content">
        <section className="dashboard-welcome">
          <h1 className="dashboard-welcome-title">Welcome, {displayName}!</h1>
        </section>

        {suggestedEvents.length > 0 && (
          <section className="events-section">
            <div className="events-section-header">
              <h2 className="events-section-title events-section-title-with-badge">
                <span>Events For You</span>
                <span className="events-ai-badge" tabIndex={0} aria-label="AI suggested events">
                  <img src="/star.png" alt="" className="events-ai-star" />
                  <span className="events-ai-tooltip">
                    AI-personalized picks based on your preferences.
                  </span>
                </span>
              </h2>
            </div>
            <div className="events-grid">
              {suggestedEvents.map((event) => (
                <EventTile key={event.id} event={event} />
              ))}
            </div>
          </section>
        )}

        <section className="events-section">
          <div className="events-section-header">
            <h2 className="events-section-title">All Events</h2>
          </div>
          {loadingEvents ? (
            <div className="dashboard-loading">Loading all events...</div>
          ) : events.length === 0 ? (
            <div className="dashboard-empty">
              <span className="dashboard-empty-icon">💤</span>
              <p>No events found.</p>
            </div>
          ) : (
            <div className="events-grid">
              {events.map((event) => (
                <EventTile key={event.id} event={event} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default DashboardPage;
