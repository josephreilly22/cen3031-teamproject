import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './MyEventsPage.css';
import SignedInNavbar from './SignedInNavbar';
import { getAuthSession } from './authSession';

function MyEventsPage() {
  const navigate = useNavigate();
  const session = getAuthSession();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session.signedIn) { navigate('/login'); return; }
    if (session.role !== 'event-host' && session.role !== 'admin') { navigate('/dashboard'); return; }

    fetch(`http://localhost:8000/events/host?email=${encodeURIComponent(session.email)}`)
      .then((r) => r.json())
      .then((data) => { if (data.success) setEvents(data.events); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [navigate, session.signedIn, session.role, session.email]);

  if (!session.signedIn || (session.role !== 'event-host' && session.role !== 'admin')) return null;

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="my-events-page">
      <SignedInNavbar title="My Events" actionLabel="Dashboard" actionPath="/dashboard" />

      <main className="my-events-content">
        <div className="my-events-header">
          <h1 className="my-events-heading">My Events</h1>
          <p className="my-events-sub">All events you've created, in one place.</p>
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
              <div className="my-event-tile" key={event.id}>
                <h3 className="my-event-title">{event.title}</h3>
                <p className="my-event-meta">{event.host} &mdash; {formatDate(event.date)}</p>
                <p className="my-event-location">📍 {event.location}</p>
                <p className="my-event-desc">{event.description}</p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default MyEventsPage;
