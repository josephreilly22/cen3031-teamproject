import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import './App.css';
import LoginPage from './LoginPage';
import HostRegistrationPage from './HostRegistrationPage';
import AboutPage from './AboutPage';
import SignupPage from './SignupPage';
import DashboardPage from './DashboardPage';
import ProfilePage from './ProfilePage';
import ForgotPasswordPage from './ForgotPasswordPage';
import OnboardingPage from './OnboardingPage';

function Home() {
  const navigate = useNavigate();

  return (
    <div className="app">
      {/* Navbar */}
      <nav className="navbar">
        <div className="logo">
          <img src={require('./assets/EventPlannerIcon.png')} alt="Event Planner" className="logo-icon" />
          <span className="logo-text">Event Planners</span>
        </div>
        <div className="nav-buttons">
          <button className="nav-register" onClick={() => navigate('/hostregistration')}>Register as a host</button>
          <button className="nav-cta" onClick={() => navigate('/login')}>Login</button>
        </div>
      </nav>

      {/* Hero Section */}
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
          <button className="btn-primary" onClick={() => navigate('/login')}>Get Started →</button>
          <button className="btn-secondary" onClick={() => navigate('/about')}>Learn More</button>
          <button className="btn-test" onClick={() => navigate('/dashboard')}>Test Dashboard</button>
        </div>

        {/* Feature Cards */}
        <div className="cards">
          <div className="card">
            <div className="card-icon icon-pink">⭐</div>
            <h3>Personalized Suggestions</h3>
            <p>Our machine learning algorithm learns what you like to do and suggests personalized events tailored to your interests.</p>
          </div>
          <div className="card">
            <div className="card-icon icon-blue">📍</div>
            <h3>Location-Based Events</h3>
            <p>Find events closest to you and discover what's coming up in your area.</p>
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
        <Route path="/forgotpassword" element={<ForgotPasswordPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
