import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import '../styles/App.css';
import LoginPage from '../pages/LoginPage';
import HostRegistrationPage from '../pages/HostRegistrationPage';
import AboutPage from '../pages/AboutPage';
import SignupPage from '../pages/SignupPage';
import DashboardPage from '../pages/DashboardPage';
import EventDetailsPage from '../pages/EventDetailsPage';
import ProfilePage from '../pages/ProfilePage';
import OnboardingPage from '../pages/OnboardingPage';
import AdminDashboard from '../pages/AdminDashboard';
import CreateEventPage from '../pages/CreateEventPage';
import EditEventPage from '../pages/EditEventPage';
import ReportEventPage from '../pages/ReportEventPage';
import MyEventsPage from '../pages/MyEventsPage';
import SiteNavbar from '../components/SiteNavbar';
import { getAuthSession } from '../utils/authSession';

function Home() {
  const navigate = useNavigate();
  const session = getAuthSession();

  const primaryCtaLabel = session.signedIn ? 'Go to Dashboard →' : 'Get Started →';
  const primaryCtaPath = session.signedIn ? '/dashboard' : '/signup';

  return (
    <div className="app">
      <SiteNavbar />

      <section className="hero">
        <h1 className="hero-heading">
          Your all-in-one for<br />
          <span className="highlight">events near you.</span>
        </h1>
        <p className="hero-sub">
          Whether you are trying to get more involved this year or just looking
          to try new things, <strong>EventPlanner8</strong> is the solution!
        </p>
        <div className="hero-buttons">
          <button className="btn-primary" onClick={() => navigate(primaryCtaPath)}>{primaryCtaLabel}</button>
          <button className="btn-secondary" onClick={() => navigate('/about')}>Learn More</button>
        </div>

        <div className="cards">
          <div className="card">
            <div className="card-icon icon-pink">⭐</div>
            <h3>Personalized Suggestions</h3>
            <p>Get event suggestions tailored to your interests, so you can quickly find things you actually enjoy.</p>
          </div>
          <div className="card">
            <div className="card-icon icon-blue">📍</div>
            <h3>Location-Based Events</h3>
            <p>See events near you and discover what&apos;s happening around campus and in your local area.</p>
          </div>
          <div className="card">
            <div className="card-icon icon-green">🛡️</div>
            <h3>Security in Mind</h3>
            <p>Verified hosts and active moderation keep listings trustworthy, so the community stays safe and welcoming.</p>
          </div>
        </div>
      </section>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="site-shell">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/host-registeration" element={<HostRegistrationPage />} />
          <Route path="/hostregistration" element={<HostRegistrationPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/dashboard/:eventId" element={<EventDetailsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/event-registrations" element={<AdminDashboard />} />
          <Route path="/create-event" element={<CreateEventPage />} />
          <Route path="/edit-event/:eventId" element={<EditEventPage />} />
          <Route path="/report-event/:eventId" element={<ReportEventPage />} />
          <Route path="/my-events" element={<MyEventsPage />} />
        </Routes>

        <footer className="site-footer">
          <span className="site-footer-symbol" aria-hidden="true">✦</span>
          Made with passion by students at the University of Florida.
        </footer>
      </div>
    </BrowserRouter>
  );
}

export default App;
