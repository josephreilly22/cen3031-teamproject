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

        <div className="about-section">
          <h2 className="about-heading">How it&apos;s built</h2>
          <p className="about-text">
            EventPlanner8 is built with a modern web stack and designed to be simple,
            fast, and reliable for discovering and hosting local events.
            We keep recommendations helpful, moderation strong, and the overall
            experience focused on community.
          </p>
          <p className="about-text">
            EventPlanner8 is open source here:{' '}
            <a
              className="about-link"
              href="https://github.com/josephreilly22/cen3031-teamproject"
              target="_blank"
              rel="noreferrer"
            >
              github.com/josephreilly22/cen3031-teamproject
            </a>
          </p>
        </div>

      </section>
    </div>
  );
}

export default AboutPage;


