import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/MyEventsPage.css';
import SignedInNavbar from '../components/SignedInNavbar';
import OverflowTitle from '../components/OverflowTitle';
import { getAuthSession } from '../utils/authSession';

const LOCATION_ENABLED_KEY = 'eventplanner.locationEnabled';
const LOCATION_COORDS_KEY = 'eventplanner.locationCoords';

function loadStoredLocation() {
  try {
    const enabled = localStorage.getItem(LOCATION_ENABLED_KEY) === 'true';
    const coordsRaw = localStorage.getItem(LOCATION_COORDS_KEY);
    const coords = coordsRaw ? JSON.parse(coordsRaw) : null;

    if (!enabled || !Array.isArray(coords) || coords.length !== 2) {
      return { enabled: false, coords: null };
    }

    const [lat, lng] = coords;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return { enabled: false, coords: null };
    }

    return { enabled: true, coords: [lat, lng] };
  } catch {
    return { enabled: false, coords: null };
  }
}

function getDistanceInMiles(from, to) {
  if (!Array.isArray(from) || !Array.isArray(to) || from.length !== 2 || to.length !== 2) {
    return null;
  }

  const [fromLat, fromLng] = from;
  const [toLat, toLng] = to;
  if (![fromLat, fromLng, toLat, toLng].every((value) => Number.isFinite(value))) {
    return null;
  }

  const toRadians = (value) => (value * Math.PI) / 180;
  const earthRadiusMiles = 3958.8;
  const latDelta = toRadians(toLat - fromLat);
  const lngDelta = toRadians(toLng - fromLng);
  const a = Math.sin(latDelta / 2) ** 2
    + Math.cos(toRadians(fromLat)) * Math.cos(toRadians(toLat)) * Math.sin(lngDelta / 2) ** 2;
  return earthRadiusMiles * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function formatDistanceLabel(distanceMiles) {
  if (!Number.isFinite(distanceMiles)) {
    return '';
  }

  if (distanceMiles < 1) {
    const feetAway = Math.max(1, Math.round(distanceMiles * 5280));
    return `${feetAway} ft`;
  }

  return `${distanceMiles.toFixed(distanceMiles >= 10 ? 0 : 1)} mi`;
}

function MyEventsPage() {
  const navigate = useNavigate();
  const session = getAuthSession();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [userLocation, setUserLocation] = useState(null);

  useEffect(() => {
    const storedLocation = loadStoredLocation();
    setLocationEnabled(storedLocation.enabled);
    setUserLocation(storedLocation.coords);

    if (!session.signedIn) { navigate('/login'); return; }
    if (session.role !== 'hoster' && session.role !== 'admin') { navigate('/dashboard'); return; }

    fetch(`http://localhost:8000/events/host?email=${encodeURIComponent(session.email)}`)
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
      .finally(() => setLoading(false));
  }, [navigate, session.signedIn, session.role, session.email]);

  if (!session.signedIn || (session.role !== 'hoster' && session.role !== 'admin')) return null;

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
      return dateOnly.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    return dateStr;
  };

  const formatEventWindow = (start, end) => {
    const startLabel = formatDate(start);
    const endLabel = formatDate(end);
    return { startLabel, endLabel };
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

  const handleEditEvent = (eventId) => {
    navigate(`/edit-event/${encodeURIComponent(eventId)}`);
  };

  const handleTileKeyDown = (event, eventId) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleEditEvent(eventId);
    }
  };

  const campusLabelForEvent = (event) => formatLocationTypes(event.location_types);
  const getEventDistanceLabel = (event) => {
    if (!locationEnabled || !userLocation || !Array.isArray(event.coordinates) || event.coordinates.length !== 2) {
      return '';
    }

    const eventCoords = event.coordinates.map((value) => Number(value));
    return formatDistanceLabel(getDistanceInMiles(userLocation, eventCoords));
  };
  const formatCardDescription = (value) => {
    const normalized = (value || '').trim();
    if (!normalized) {
      return '';
    }

    const sentenceMatch = normalized.match(/^.*?[.!?](?=(?:\s|$))/s);
    return (sentenceMatch ? sentenceMatch[0] : normalized).trim();
  };

  return (
    <div className="my-events-page">
      <SignedInNavbar title="My Events" actionLabel="Dashboard" actionPath="/dashboard" />

      <main className="my-events-content">
        <div className="my-events-header">
          <div className="my-events-header-copy">
            <h1 className="my-events-heading">My Events</h1>
            <p className="my-events-sub">All events you've created, in one place.</p>
          </div>
          <button className="my-events-create-btn" onClick={() => navigate('/create-event')}>
            + Create Event
          </button>
        </div>

        {loading ? (
          <p className="my-events-loading">Loading your events...</p>
        ) : events.length === 0 ? (
          <div className="my-events-empty">
            <span className="my-events-empty-icon">📅</span>
            <p>You haven't created any events yet.</p>
            <button className="my-events-create-btn" onClick={() => navigate('/create-event')}>
              Create your first event
            </button>
          </div>
        ) : (
          <div className="my-events-grid">
            {events.map((event) => (
              <div
                className="my-event-tile"
                key={event.id}
                role="button"
                tabIndex={0}
                onClick={() => handleEditEvent(event.id)}
                onKeyDown={(e) => handleTileKeyDown(e, event.id)}
                aria-label={`Edit ${event.title}`}
              >
                <div className="my-event-title-row">
                  <OverflowTitle text={event.title || ''} className="my-event-title" />
                  {isEventLive(event.date, event.end_date) && (
                    <span className="my-event-live">
                      <span className="my-event-live-dot" aria-hidden="true" />
                      LIVE
                    </span>
                  )}
                </div>
                {campusLabelForEvent(event) && (
                  <div className="my-event-campus-tags">
                    {campusLabelForEvent(event).split(', ').map((label) => (
                      <span key={label} className="my-event-campus-tag">{label}</span>
                    ))}
                  </div>
                )}
                <p className="my-event-location">
                  {'\u{1F4CD}'} {event.location}
                  {locationEnabled && (
                    <span className="my-event-location-distance">
                      {' '}
                      {getEventDistanceLabel(event) || 'N/A'}
                    </span>
                  )}
                </p>
                <div className="my-event-meta-group">
                  <p className="my-event-meta">{event.host}</p>
                  {(() => {
                    const { startLabel, endLabel } = formatEventWindow(event.date, event.end_date);
                    return (
                      <>
                        {startLabel && (
                          <p className="my-event-date">
                            <span>Starts:</span> {startLabel}
                          </p>
                        )}
                        {endLabel && <p className="my-event-date"><span>Ends:</span> {endLabel}</p>}
                      </>
                    );
                  })()}
                </div>
                <p className="my-event-desc">{formatCardDescription(event.description)}</p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default MyEventsPage;


