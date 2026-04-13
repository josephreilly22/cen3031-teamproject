import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import '../styles/EventDetailsPage.css';
import '../styles/DashboardPage.css';
import SignedInNavbar from '../components/SignedInNavbar';
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

const avatarGradients = [
  ['#4f7ed8', '#8a7ae6'],
  ['#3b8ea5', '#6ec6ca'],
  ['#d46a6a', '#f0a6a6'],
  ['#5b9bd5', '#7a89f0'],
  ['#3d7f6f', '#77b28c'],
  ['#9a6ad6', '#d58edc'],
  ['#4f6bd8', '#d07ca6'],
  ['#4d8f5f', '#b0c96e'],
];

const getGradientForUser = (attendee) => {
  const seed = attendee.email || attendee.firstName || attendee.lastName || 'user';
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(index);
    hash |= 0;
  }

  const [start, end] = avatarGradients[Math.abs(hash) % avatarGradients.length];
  return `linear-gradient(135deg, ${start}, ${end})`;
};

function getAvatarInitials(firstName, lastName, email) {
  const nameParts = `${String(firstName || '').trim()} ${String(lastName || '').trim()}`
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const nameInitials = nameParts.length >= 2
    ? `${nameParts[0][0] || ''}${nameParts[nameParts.length - 1][0] || ''}`
    : (nameParts[0] || '').slice(0, 2);
  const emailInitial = String(email || '').trim().charAt(0);
  return (nameInitials || emailInitial || 'U').toUpperCase();
}

function EventDetailsPage() {
  const navigate = useNavigate();
  const { eventId } = useParams();
  const session = getAuthSession();
  const [event, setEvent] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [attendeeCount, setAttendeeCount] = useState(0);
  const [ownerProfile, setOwnerProfile] = useState(null);
  const [isAttending, setIsAttending] = useState(false);
  const [attendLoading, setAttendLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [userLocation, setUserLocation] = useState(null);

  useEffect(() => {
    const storedLocation = loadStoredLocation();
    setLocationEnabled(storedLocation.enabled);
    setUserLocation(storedLocation.coords);

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

    fetch(`http://localhost:8000/profile?email=${encodeURIComponent(session.email)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setIsAttending(Array.isArray(data.attending_event_ids) && data.attending_event_ids.includes(eventId));
        }
      })
      .catch(() => {});
  }, [eventId, navigate, session.onboardingComplete, session.signedIn]);

  useEffect(() => {
    if (!event?.id) {
      return;
    }

    fetch(`http://localhost:8000/events/${encodeURIComponent(event.id)}/attendees`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setAttendees(data.attendees || []);
          setAttendeeCount(Number(data.attendee_count) || 0);
        }
      })
      .catch(() => {});
  }, [event?.id]);

  useEffect(() => {
    if (!event?.owner_email) {
      setOwnerProfile(null);
      return;
    }

    if (event.owner_email === session.email) {
      setOwnerProfile({
        first_name: session.firstName || '',
        last_name: session.lastName || '',
      });
      return;
    }

    fetch(`http://localhost:8000/profile?email=${encodeURIComponent(event.owner_email)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setOwnerProfile({
            first_name: data.first_name || '',
            last_name: data.last_name || '',
          });
        } else {
          setOwnerProfile(null);
        }
      })
      .catch(() => {
        setOwnerProfile(null);
      });
  }, [event?.owner_email, session.email, session.firstName, session.lastName]);

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

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      return 'unsupported';
    }

    if (Notification.permission === 'granted' || Notification.permission === 'denied') {
      return Notification.permission;
    }

    return Notification.requestPermission();
  };

  const sendLiveNotification = () => {
    if (!('Notification' in window) || Notification.permission !== 'granted' || !event) {
      return;
    }

    const startTime = event.date ? new Date(event.date) : null;
    if (!startTime || Number.isNaN(startTime.getTime())) {
      return;
    }

    const delay = startTime.getTime() - Date.now();
    if (delay <= 0) {
      return;
    }

    window.clearTimeout(window.__eventLiveNotifyTimer);
    window.__eventLiveNotifyTimer = window.setTimeout(() => {
      if (Notification.permission === 'granted') {
        new Notification(`${event.title} is starting now`, {
          body: 'The event is beginning.',
        });
      }
    }, delay);
  };

  useEffect(() => {
    if (isAttending && event?.date) {
      sendLiveNotification();
    }
  }, [isAttending, event?.date]);

  const toggleAttendance = async () => {
    if (!event?.id || attendLoading) {
      return;
    }

    setAttendLoading(true);
    try {
      const url = isAttending
        ? `http://localhost:8000/events/${encodeURIComponent(event.id)}/attend?email=${encodeURIComponent(session.email)}`
        : `http://localhost:8000/events/${encodeURIComponent(event.id)}/attend`;
      const response = await fetch(url, isAttending ? { method: 'DELETE' } : {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: session.email }),
      });
      const payload = await response.json();
      if (!payload.success) {
        return;
      }

      if (!isAttending) {
        await requestNotificationPermission();
      }

      setIsAttending(Boolean(payload.attending));
      setAttendeeCount(Number(payload.attendee_count) || 0);
      fetch(`http://localhost:8000/events/${encodeURIComponent(event.id)}/attendees`)
        .then((r) => r.json())
        .then((data) => {
          if (data.success) {
            setAttendees(data.attendees || []);
            setAttendeeCount(Number(data.attendee_count) || 0);
          }
        })
        .catch(() => {});
    } catch {
      // ignore
    } finally {
      setAttendLoading(false);
    }
  };

  const isEventOwner = Boolean(event && event.owner_email === session.email);
  const isOwnerOrAdmin = Boolean(event && (session.role === 'admin' || isEventOwner));

  if (!session.signedIn || !session.onboardingComplete) {
    return null;
  }

  const live = event ? isEventLive(event.date, event.end_date) : false;
  const campusLabel = event ? formatLocationTypes(event.location_types) : '';
  const distanceLabel = locationEnabled && userLocation && Array.isArray(event?.coordinates) && event.coordinates.length === 2
    ? formatDistanceLabel(getDistanceInMiles(userLocation, event.coordinates.map((value) => Number(value))))
    : '';
  const canEditEvent = isOwnerOrAdmin;
  const canAttendEvent = !isEventOwner;
  const canReportEvent = !isEventOwner;
  const visibleAttendees = [
    ...(event?.owner_email
      ? [{
          email: event.owner_email,
          first_name: event.owner_email === session.email
            ? session.firstName || ''
            : ownerProfile?.first_name || '',
          last_name: event.owner_email === session.email
            ? session.lastName || ''
            : ownerProfile?.last_name || '',
          role: 'host',
        }]
      : []),
    ...attendees.filter((attendee) => attendee.email !== event?.owner_email),
  ];
  const visibleAttendeeCount = Math.max(Number(attendeeCount || 0), visibleAttendees.length);

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
                    {locationEnabled && (
                      <span className="event-location-distance">
                        {' '}
                        {distanceLabel || 'N/A'}
                      </span>
                    )}
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

                {(canEditEvent || canReportEvent) && (
                  <div className="event-details-action-row">
                    {canEditEvent && (
                      <button
                        type="button"
                        className="event-details-edit-btn"
                        onClick={() => navigate(`/edit-event/${encodeURIComponent(event.id)}`)}
                      >
                        Edit Event
                      </button>
                    )}
                    {canReportEvent && (
                      <button
                        type="button"
                        className="event-details-report-btn"
                        onClick={() => navigate(`/report-event/${encodeURIComponent(event.id)}`)}
                      >
                        Report Event
                      </button>
                    )}
                  </div>
                )}
              </aside>

              <section className="event-details-attendance-card">
                <div className="event-details-attendance-header event-details-attendance-header--card">
                  <p className="event-details-section-label">Attending</p>
                  {canAttendEvent && (
                    <button
                      type="button"
                      className={`event-details-attend-btn ${isAttending ? 'event-details-attend-btn--filled' : ''}`}
                      onClick={toggleAttendance}
                      disabled={attendLoading}
                    >
                      {isAttending ? 'Unattend' : 'Attend'}
                    </button>
                  )}
                </div>
                <div className="event-details-attendance-row">
                  <p className="event-details-meta-value">
                    {visibleAttendeeCount} {visibleAttendeeCount === 1 ? 'person is attending!' : 'people are attending!'}
                  </p>
                </div>
                {isOwnerOrAdmin && visibleAttendees.length > 0 && (
                  <div className="event-details-attendee-list">
                    {visibleAttendees.map((attendee) => {
                      const fullName = `${attendee.first_name || ''} ${attendee.last_name || ''}`.trim();
                      const displayName = fullName || (attendee.role === 'host' ? event.host : attendee.email);
                      const roleLabel = attendee.role === 'host'
                        ? 'HOST'
                        : attendee.role === 'admin'
                          ? 'ADMIN'
                          : '';
                      return (
                        <div key={attendee.email} className="event-details-attendee-row">
                        <span
                          className="event-details-attendee-avatar"
                          style={{ background: getGradientForUser(attendee) }}
                          aria-hidden="true"
                        >
                          {getAvatarInitials(attendee.first_name, attendee.last_name, attendee.email)}
                        </span>
                          <div className="event-details-attendee-text">
                            <div className="event-details-attendee-name-row">
                              <p>{displayName}</p>
                              {roleLabel && <span className="event-details-attendee-role">{roleLabel}</span>}
                            </div>
                            <span>{attendee.email}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </section>
          </>
        ) : null}
      </main>
    </div>
  );
}

export default EventDetailsPage;
