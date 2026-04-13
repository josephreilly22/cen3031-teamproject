import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/DashboardPage.css';
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

function EventTile({ event, attending, hosting, userLocation, locationEnabled }) {
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
  const eventCoordinates = Array.isArray(event.coordinates) && event.coordinates.length === 2
    ? event.coordinates.map((value) => Number(value))
    : null;
  const distanceLabel = locationEnabled && userLocation && eventCoordinates
    ? formatDistanceLabel(getDistanceInMiles(userLocation, eventCoordinates))
    : '';
  const statusBadges = [];
  if (live) {
    statusBadges.push({ key: 'live', label: 'LIVE', kind: 'live' });
  }
  if (attending) {
    statusBadges.push({ key: 'attending', label: '✅', kind: 'attending' });
  }
  if (hosting) {
    statusBadges.push({ key: 'hosting', label: '📣', kind: 'hosting' });
  }

  return (
    <div
      className={`event-tile ${event.ai_ranked ? 'event-tile--ai-ranked' : ''}`}
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
        {statusBadges.length > 0 && (
          <div className="event-status-badges" aria-label={statusBadges.map((badge) => badge.label).join(', ')}>
            {statusBadges.slice().reverse().map((badge) => (
                badge.kind === 'live' ? (
                  <span key={badge.key} className="event-live">
                    <span className="event-live-dot" aria-hidden="true" />
                    {badge.label}
                  </span>
                ) : badge.kind === 'hosting' ? (
                  <span key={badge.key} className="event-attending-badge event-attending-badge--host" title="You are hosting">
                    {badge.label}
                  </span>
                ) : (
                  <span key={badge.key} className="event-attending-badge" title="You are attending">
                    {badge.label}
                  </span>
                )
            ))}
          </div>
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
          {locationEnabled && (
            <span className="event-location-distance">
              {' '}
              {distanceLabel || 'N/A'}
            </span>
          )}
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
  const [suggestedEvents, setSuggestedEvents] = useState([]);
  const [userEventType, setUserEventType] = useState([]);
  const [userInterests, setUserInterests] = useState('');
  const [attendingEventIds, setAttendingEventIds] = useState([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingSuggestedEvents, setLoadingSuggestedEvents] = useState(true);
  const [allEventsSort, setAllEventsSort] = useState('start-time');
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [locationUpdatedAt, setLocationUpdatedAt] = useState(null);
  const sortMenuRef = useRef(null);

  const sortOptions = [
    { value: 'start-time', label: 'Start Time' },
    { value: 'recently-published', label: 'Recently Published' },
    { value: 'a-z', label: 'A-Z' },
    { value: 'distance', label: 'Distance' },
    { value: 'attending', label: 'Attending' },
  ];

  useEffect(() => {
    if (!session.signedIn) {
      navigate('/login');
    } else if (!session.onboardingComplete) {
      navigate('/onboarding');
    }
  }, [navigate, session.signedIn, session.onboardingComplete]);

  useEffect(() => {
    const storedLocation = loadStoredLocation();
    setLocationEnabled(storedLocation.enabled);
    setUserLocation(storedLocation.coords);
    setLocationUpdatedAt(storedLocation.enabled ? Date.now() : null);

    if (!session.signedIn || !session.onboardingComplete) {
      return;
    }

    fetch(`http://localhost:8000/profile?email=${encodeURIComponent(session.email)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setUserEventType(Array.isArray(data.event_type) ? data.event_type : []);
          setUserInterests((data.interests || '').trim());
          setAttendingEventIds(Array.isArray(data.attending_event_ids) ? data.attending_event_ids : []);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingProfile(false));

    fetch('http://localhost:8000/events')
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setEvents(data.events || []);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingEvents(false));

  }, [session.email, session.signedIn, session.onboardingComplete]);

  useEffect(() => {
    if (loadingProfile) {
      return;
    }

    if (!userInterests.trim()) {
      setSuggestedEvents([]);
      setLoadingSuggestedEvents(false);
      return;
    }

    setLoadingSuggestedEvents(true);
    fetch(`http://localhost:8000/events/recommended?email=${encodeURIComponent(session.email)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setSuggestedEvents(data.events || []);
        } else {
          setSuggestedEvents([]);
        }
      })
      .catch(() => {
        setSuggestedEvents([]);
      })
      .finally(() => setLoadingSuggestedEvents(false));
  }, [loadingProfile, session.email, userInterests]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!sortMenuRef.current?.contains(event.target)) {
        setSortMenuOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setSortMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  useEffect(() => {
    if (!locationEnabled || !navigator.geolocation) {
      return undefined;
    }

    const refreshLocation = () => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = [position.coords.latitude, position.coords.longitude];
          setUserLocation(coords);
          setLocationUpdatedAt(Date.now());
          try {
            localStorage.setItem(LOCATION_ENABLED_KEY, 'true');
            localStorage.setItem(LOCATION_COORDS_KEY, JSON.stringify(coords));
          } catch {}
        },
        () => {},
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 },
      );
    };

    const intervalId = window.setInterval(refreshLocation, 60000);
    refreshLocation();

    return () => window.clearInterval(intervalId);
  }, [locationEnabled]);

  if (!session.signedIn || !session.onboardingComplete) {
    return null;
  }

  const displayName = session.fullName || session.firstName || 'User';

  const compareStartTime = (firstEvent, secondEvent) => {
    const firstTime = new Date(firstEvent.date || 0).getTime();
    const secondTime = new Date(secondEvent.date || 0).getTime();
    return firstTime - secondTime;
  };

  const compareRecentlyPublished = (firstEvent, secondEvent) => {
    const firstTime = new Date(firstEvent.published_at || firstEvent.created_at || 0).getTime();
    const secondTime = new Date(secondEvent.published_at || secondEvent.created_at || 0).getTime();
    return secondTime - firstTime;
  };

  const compareAlphabetical = (firstEvent, secondEvent) => {
    const collator = new Intl.Collator(undefined, {
      usage: 'sort',
      sensitivity: 'variant',
      numeric: true,
      caseFirst: 'false',
    });

    return collator.compare(firstEvent.title || '', secondEvent.title || '');
  };

  const compareDistance = (firstEvent, secondEvent) => {
    if (!locationEnabled || !userLocation) {
      return compareStartTime(firstEvent, secondEvent);
    }

    const getEventCoords = (event) => (
      Array.isArray(event.coordinates) && event.coordinates.length === 2
        ? event.coordinates.map((value) => Number(value))
        : null
    );

    const firstDistance = getDistanceInMiles(userLocation, getEventCoords(firstEvent));
    const secondDistance = getDistanceInMiles(userLocation, getEventCoords(secondEvent));

    const firstMissing = !Number.isFinite(firstDistance);
    const secondMissing = !Number.isFinite(secondDistance);
    if (firstMissing && secondMissing) {
      return compareStartTime(firstEvent, secondEvent);
    }

    if (firstMissing) {
      return 1;
    }

    if (secondMissing) {
      return -1;
    }

    if (firstDistance !== secondDistance) {
      return firstDistance - secondDistance;
    }

    return compareStartTime(firstEvent, secondEvent);
  };

  const normalizeEventTags = (types) => {
    if (!Array.isArray(types)) {
      return [];
    }

    return [...new Set(types.map((type) => `${type}`.trim()).filter(Boolean))].sort();
  };

  const eventTypeToTags = (value) => {
    if (Array.isArray(value)) {
      return [...new Set(value.map((tag) => `${tag}`.trim()).filter((tag) => tag === 'on-campus' || tag === 'off-campus'))];
    }

    return [];
  };

  const tagSuggestedEvents = events
    .filter((event) => {
      const userTags = eventTypeToTags(userEventType);
      if (userTags.length === 0) {
        return false;
      }

      const eventTags = normalizeEventTags(event.location_types);
      if (eventTags.length === 0) {
        return false;
      }

      return userTags.some((tag) => eventTags.includes(tag));
    })
    .slice(0, 5);

  const sortedAllEvents = [...events].sort((firstEvent, secondEvent) => {
    if (allEventsSort === 'recently-published') {
      return compareRecentlyPublished(firstEvent, secondEvent);
    }

    if (allEventsSort === 'a-z') {
      const alphabeticalOrder = compareAlphabetical(firstEvent, secondEvent);
      return alphabeticalOrder !== 0 ? alphabeticalOrder : compareStartTime(firstEvent, secondEvent);
    }

    if (allEventsSort === 'distance') {
      return compareDistance(firstEvent, secondEvent);
    }

    if (allEventsSort === 'attending') {
      return compareStartTime(firstEvent, secondEvent);
    }

    return compareStartTime(firstEvent, secondEvent);
  });
  const attendingEventIdSet = new Set(attendingEventIds);
  const displayedAllEvents = allEventsSort === 'attending'
    ? sortedAllEvents.filter((event) => (
      attendingEventIdSet.has(event.id) || event.owner_email === session.email
    ))
    : sortedAllEvents;

  const hasAiInterests = !loadingProfile && userInterests.length > 0;
  const aiSuggestedIds = new Set(suggestedEvents.map((event) => event.id));
  const supplementalTagSuggestedEvents = tagSuggestedEvents.filter((event) => !aiSuggestedIds.has(event.id));
  const displayedSuggestedEvents = hasAiInterests
    ? [...suggestedEvents, ...supplementalTagSuggestedEvents].slice(0, 5)
    : tagSuggestedEvents;
  const showSuggestedSection = !loadingProfile && events.length > 0 && (
    hasAiInterests
      ? (loadingSuggestedEvents || displayedSuggestedEvents.length > 0)
      : displayedSuggestedEvents.length > 0
  );
  const activeSortLabel = sortOptions.find(({ value }) => value === allEventsSort)?.label || 'Start Time';
  const availableSortOptions = sortOptions.filter(({ value }) => value !== allEventsSort);
  const handleGetLocation = () => {
    if (locationEnabled) {
      setLocationEnabled(false);
      setUserLocation(null);
      setLocationUpdatedAt(null);
      try {
        localStorage.removeItem(LOCATION_ENABLED_KEY);
        localStorage.removeItem(LOCATION_COORDS_KEY);
      } catch {}
      return;
    }

    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = [position.coords.latitude, position.coords.longitude];
        setLocationEnabled(true);
        setUserLocation(coords);
        try {
          localStorage.setItem(LOCATION_ENABLED_KEY, 'true');
          localStorage.setItem(LOCATION_COORDS_KEY, JSON.stringify(coords));
        } catch {}
        setLocationLoading(false);
      },
      () => {
        setLocationEnabled(false);
        setUserLocation(null);
        setLocationUpdatedAt(null);
        try {
          localStorage.removeItem(LOCATION_ENABLED_KEY);
          localStorage.removeItem(LOCATION_COORDS_KEY);
        } catch {}
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  };

  return (
    <div className="dashboard">
      <SignedInNavbar title="Dashboard" actionLabel="Dashboard" actionPath="/dashboard" />

      <main className="dashboard-content">
        <section className="dashboard-welcome">
          <h1 className="dashboard-welcome-title">Welcome, {displayName}!</h1>
        </section>

        {showSuggestedSection && (
          <section className="events-section">
            <div className="events-section-header">
              <h2 className="events-section-title events-section-title-with-badge">
                <span>Events For You</span>
                <button
                  type="button"
                  className={`events-ai-badge ${hasAiInterests ? '' : 'events-ai-badge--inactive'}`}
                  aria-label={hasAiInterests ? 'AI suggested events' : 'Update your interests'}
                  onClick={() => navigate('/profile?focus=interests#profileInterests')}
                >
                  <span className="events-ai-badge-burst" aria-hidden="true" />
                  <img src="/star.png" alt="" className="events-ai-star" />
                  <span className={`events-ai-tooltip ${hasAiInterests ? '' : 'events-ai-tooltip--info'}`}>
                    {hasAiInterests
                      ? 'AI-personalized picks based on your preferences.'
                      : 'Update your interests to enable AI-personalized picks.'}
                  </span>
                </button>
              </h2>
            </div>
            {hasAiInterests && loadingSuggestedEvents ? (
              <div className="dashboard-empty dashboard-empty--loading-ai" aria-live="polite">
                <span className="events-ai-badge events-ai-badge--loading dashboard-empty-ai-icon" aria-hidden="true">
                  <img src="/star.png" alt="" className="events-ai-star events-ai-star--loading dashboard-empty-ai-star" />
                </span>
                <p className="dashboard-empty-loading-title">Loading events for you...</p>
                <p>AI-personalized picks are on the way.</p>
              </div>
            ) : (
              <div className="events-grid">
                {(!hasAiInterests || !loadingSuggestedEvents) && displayedSuggestedEvents.map((event) => (
                  <EventTile
                    key={event.id}
                    event={event}
                    attending={attendingEventIdSet.has(event.id)}
                    hosting={event.owner_email === session.email}
                    userLocation={userLocation}
                    locationEnabled={locationEnabled}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        <section className="events-section">
          <div className="events-section-header events-section-header--with-actions">
            <h2 className="events-section-title">All Events</h2>
            <div className="events-sort-group">
              <div className={`events-location-control ${locationEnabled ? 'events-location-control--active' : ''} ${locationLoading ? 'events-location-control--disabled' : ''}`}>
                <span className="events-location-btn-label">Location</span>
                <button
                  type="button"
                  className={`events-location-trigger ${locationLoading ? 'events-location-trigger--loading' : ''}`}
                  onClick={handleGetLocation}
                  disabled={locationLoading}
                >
                  <span className="events-location-btn-state">
                    {locationLoading ? '⌛' : (locationEnabled ? 'On' : 'Off')}
                  </span>
                </button>
              </div>
              <div ref={sortMenuRef} className={`events-sort-control ${sortMenuOpen ? 'events-sort-control--open' : ''}`}>
                <span className="events-sort-label">SORT BY</span>
                <div className={`events-sort-box ${sortMenuOpen ? 'events-sort-box--open' : ''}`}>
                <button
                  type="button"
                  className="events-sort-trigger"
                  aria-haspopup="menu"
                  aria-expanded={sortMenuOpen}
                  onClick={() => setSortMenuOpen((previousState) => !previousState)}
                >
                  <span>{activeSortLabel}</span>
                  <span className="events-sort-caret" aria-hidden="true" />
                </button>
                {sortMenuOpen && (
                  <div className="events-sort-menu" role="menu" aria-label="Sort all events">
                    {availableSortOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        role="menuitem"
                        className="events-sort-option"
                        onClick={() => {
                          setAllEventsSort(option.value);
                          setSortMenuOpen(false);
                        }}
                      >
                        <span>{option.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              </div>
            </div>
          </div>
          {loadingEvents ? (
            <div className="dashboard-loading">Loading all events...</div>
          ) : events.length === 0 ? (
            <div className="dashboard-empty">
              <span className="dashboard-empty-icon" aria-hidden="true">💤</span>
              <p>No events found.</p>
            </div>
          ) : (
            <div className="events-grid">
              {displayedAllEvents.map((event) => (
                <EventTile
                  key={event.id}
                  event={event}
                  attending={attendingEventIdSet.has(event.id)}
                  hosting={event.owner_email === session.email}
                  userLocation={userLocation}
                  locationEnabled={locationEnabled}
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default DashboardPage;
