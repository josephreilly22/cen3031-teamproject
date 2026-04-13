import { useNavigate } from 'react-router-dom';
import '../styles/App.css';
import '../styles/AboutPage.css';
import SiteNavbar from '../components/SiteNavbar';

function AboutPage() {
  const navigate = useNavigate();

  return (
    <div className="app">
      <SiteNavbar />

      <section className="hero about-hero">
        <h1 className="hero-heading">
          Built for people who<br />
          <span className="highlight">love great events.</span>
        </h1>
        <p className="hero-sub">
          <strong>EventPlanner8</strong> is a student-built platform from the <strong>University of Florida</strong> connecting people with local events tailored to their interests, powered by smart recommendations and a verified host ecosystem.
        </p>

        <div className="hero-buttons about-actions">
          <button className="btn-primary about-back-btn" onClick={() => navigate('/')}>← Go Back</button>
        </div>

        <div className="cards" style={{ marginBottom: '56px' }}>
          <div className="card">
            <div className="card-icon icon-pink">⭐</div>
            <h3>Personalized Suggestions</h3>
            <p>Our machine learning algorithm learns what you enjoy and surfaces events that actually match your interests, not just what&apos;s nearby.</p>
          </div>
          <div className="card">
            <div className="card-icon icon-blue">📍</div>
            <h3>Location-Based Events</h3>
            <p>Discover what&apos;s happening around you. We surface events close to your location so you never miss something great in your area.</p>
          </div>
          <div className="card">
            <div className="card-icon icon-green">🛡️</div>
            <h3>Security in Mind</h3>
            <p>Every host goes through a verification process. Our moderation system uses AI to keep listings legitimate and our community safe.</p>
          </div>
        </div>

        <div className="about-section">
          <h2 className="about-heading">How it&apos;s built</h2>
          <p className="about-text">
            The frontend is built with <strong>React</strong> and <strong>React Router</strong>.
            The backend runs on <strong>Python</strong> with a <strong>MongoDB</strong> database.
            Our recommendation engine uses a fine-tuned <strong>MiniLM</strong> embedding model
            for semantic similarity, while our content moderation leverages a
            <strong> ModernBERT</strong> zero-shot classifier, both hosted on Hugging Face Spaces
            and served via Gradio for fast, efficient inference.
          </p>
        </div>

        <p className="about-footer">Made with passion by students at the University of Florida.</p>
      </section>
    </div>
  );
}

export default AboutPage;


