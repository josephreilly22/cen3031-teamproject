import { useNavigate } from 'react-router-dom';
import './App.css';
import './AboutPage.css';

function AboutPage() {
  const navigate = useNavigate();

  return (
    <div className="app">
      {/* Navbar */}
      <nav className="navbar">
        <div className="logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          <img src={require('./assets/EventPlannerIcon.png')} alt="Event Planner" className="logo-icon" />
          <span className="logo-text">Event Planners</span>
        </div>
        <div className="nav-buttons">
          <button className="nav-register" onClick={() => navigate('/hostregistration')}>Register as a host</button>
          <button className="nav-cta" onClick={() => navigate('/login')}>Login</button>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero">
        <h1 className="hero-heading">
          Built for people who<br />
          <span className="highlight">love great events.</span>
        </h1>
        <p className="hero-sub">
          Event Planners is a student-built platform from the University of Florida
          connecting people with local events tailored to their interests — powered
          by smart recommendations and a verified host ecosystem.
        </p>

        {/* What We Do */}
        <div className="cards" style={{ marginBottom: '56px' }}>
          <div className="card">
            <div className="card-icon icon-pink">⭐</div>
            <h3>Personalized Suggestions</h3>
            <p>Our machine learning algorithm learns what you enjoy and surfaces events that actually match your interests — not just what's nearby.</p>
          </div>
          <div className="card">
            <div className="card-icon icon-blue">📍</div>
            <h3>Location-Based Events</h3>
            <p>Discover what's happening around you. We surface events close to your location so you never miss something great in your area.</p>
          </div>
          <div className="card">
            <div className="card-icon icon-green">🛡️</div>
            <h3>Security in Mind</h3>
            <p>Every host goes through a verification process. Our moderation system uses AI to keep listings legitimate and our community safe.</p>
          </div>
        </div>

        {/* Tech Stack */}
        <div className="about-section">
          <h2 className="about-heading">How it's built</h2>
          <p className="about-text">
            The frontend is built with <strong>React</strong> and <strong>React Router</strong>.
            The backend runs on <strong>Python</strong> with a <strong>MongoDB</strong> database.
            Our recommendation engine uses a fine-tuned <strong>MiniLM</strong> embedding model
            for semantic similarity, while our content moderation leverages a
            <strong> ModernBERT</strong> zero-shot classifier — both hosted on Hugging Face Spaces
            and served via Gradio for fast, efficient inference.
          </p>
        </div>

        {/* CTA */}
        <div className="about-cta">
          <button className="btn-primary" onClick={() => navigate('/login')}>Get Started →</button>
          <button className="btn-secondary" onClick={() => navigate('/hostregistration')}>Become a Host</button>
        </div>

        <p className="about-footer">Made with passion by students at the University of Florida ✨</p>
      </section>
    </div>
  );
}

export default AboutPage;
