import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './DashboardPage.css';
import SignedInNavbar from './SignedInNavbar';
import { getAuthSession } from './authSession';

// TODO: replace with real data from backend
const MOCK_EVENTS = [
  {
    id: 1,
    title: 'Spring Hackathon 2025',
    host: 'Gator Dev Club',
    date: 'Apr 18, 2025',
    description: 'A 24-hour hackathon open to all students. Build something amazing, win prizes, and meet fellow developers on campus.',
  },
  {
    id: 2,
    title: 'Jazz Night at the Plaza',
    host: 'UF Music Society',
    date: 'Apr 22, 2025',
    description: 'An evening of live jazz performances featuring student and local musicians. Free entry, food trucks on site.',
  },
  {
    id: 3,
    title: 'Community Volunteer Day',
    host: 'GatorCares',
    date: 'Apr 26, 2025',
    description: 'Join us for a morning of volunteering at local parks and community centers. All supplies provided.',
  },
  {
    id: 4,
    title: 'Film Screening: Dune Part II',
    host: 'Cinema Guild',
    date: 'Apr 28, 2025',
    description: 'Outdoor screening on Turlington Plaza. Bring blankets and snacks. Starts at sundown.',
  },
  {
    id: 5,
    title: 'Cooking Workshop: Thai Cuisine',
    host: 'Multicultural Student Center',
    date: 'May 2, 2025',
    description: 'Hands-on cooking class learning the basics of Thai cooking. Ingredients and equipment provided. Limited spots.',
  },
  {
    id: 6,
    title: 'Tech Talk: AI in Healthcare',
    host: 'Pre-Med Tech Society',
    date: 'May 5, 2025',
    description: 'Panel discussion with industry professionals on how AI is transforming modern healthcare and diagnostics.',
  },
];

function EventTile({ event }) {
  return (
    <div className="event-tile">
      <h3 className="event-tile-title">{event.title}</h3>
      <p className="event-tile-meta">{event.host} &mdash; {event.date}</p>
      <p className="event-tile-desc">{event.description}</p>
    </div>
  );
}

function DashboardPage() {
  const navigate = useNavigate();
  const session = getAuthSession();

  useEffect(() => {
    if (!session.signedIn) {
      navigate('/login');
    } else if (!session.onboardingComplete) {
      navigate('/onboarding');
    }
  }, [navigate, session.signedIn, session.onboardingComplete]);

  if (!session.signedIn || !session.onboardingComplete) {
    return null;
  }

  return (
    <div className="dashboard">
      <SignedInNavbar title="Dashboard" actionLabel="Profile" actionPath="/profile" />

      <main className="dashboard-content">

        <section className="events-section">
          <h2 className="events-section-title">Events For You</h2>
          <div className="events-grid">
            {MOCK_EVENTS.slice(0, 3).map((event) => (
              <EventTile key={event.id} event={event} />
            ))}
          </div>
        </section>

        <section className="events-section">
          <h2 className="events-section-title">All Events</h2>
          <div className="events-grid">
            {MOCK_EVENTS.map((event) => (
              <EventTile key={event.id} event={event} />
            ))}
          </div>
        </section>

      </main>
    </div>
  );
}

export default DashboardPage;
