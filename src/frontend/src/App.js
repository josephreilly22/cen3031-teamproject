import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import './App.css';
import LoginPage from './LoginPage';
import HostRegistrationPage from './HostRegistrationPage';
import AboutPage from './AboutPage';
import SignupPage from './SignupPage';
import DashboardPage from './DashboardPage';
import ProfilePage from './ProfilePage';
import OnboardingPage from './OnboardingPage';
import AdminDashboard from './AdminDashboard';
import CreateEventPage from './CreateEventPage';
import SiteNavbar from './SiteNavbar';
import { getAuthSession } from './authSession';

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
          to try new things, event planners is the solution!
        </p>
        <div className="hero-buttons">
          <button className="btn-primary" onClick={() => navigate(primaryCtaPath)}>{primaryCtaLabel}</button>
          <button className="btn-secondary" onClick={() => navigate('/about')}>Learn More</button>
        </div>

        <div className="cards">
          <div className="card">
            <div className="card-icon icon-pink">⭐</div>
            <h3>Personalized Suggestions</h3>
            <p>Our machine learning algorithm learns what you like to do and suggests personalized events tailored to your interests.</p>
          </div>
          <div className="card">
            <div className="card-icon icon-blue">📍</div>
            <h3>Location-Based Events</h3>
            <p>Find events closest to you and discover what&apos;s coming up in your area.</p>
          </div>
          <div className="card">
            <div className="card-icon icon-green">🛡️</div>
            <h3>Security in Mind</h3>
            <p>Our host verification process ensures every event is legitimate, protecting our community from fraudulent listings and unverified organizers.</p>
          </div>
        </div>
      </section>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/hostregistration" element={<HostRegistrationPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/event-registrations" element={<AdminDashboard />} />
        <Route path="/create-event" element={<CreateEventPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
