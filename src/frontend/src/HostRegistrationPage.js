import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './App.css';
import './HostRegistrationPage.css';

function HostRegistrationPage() {
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    organization: '',
    message: '',
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="app">
      {/* Navbar */}
      <nav className="navbar">
        <div className="logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          <img src={require('./assets/EventPlannerIcon.png')} alt="Event Planner" className="logo-icon" />
          <span className="logo-text">Event Planners</span>
        </div>
        <div className="nav-buttons">
          <button className="nav-cta" onClick={() => navigate('/login')}>Login</button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero">
        <h1 className="hero-heading">
          Host your next<br />
          <span className="highlight">big event with us.</span>
        </h1>

        <p className="hero-sub">
          Join a growing community of trusted event organizers. Submit an application
          to register as an event host and unlock greater outreach, verified visibility,
          and powerful tools to help your events thrive.
        </p>

        {!submitted ? (
          <form className="host-form" onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  name="name"
                  placeholder="Jane Doe"
                  value={form.name}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  name="email"
                  placeholder="jane@example.com"
                  value={form.email}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-group full-width">
              <label>Organization / Event Name</label>
              <input
                type="text"
                name="organization"
                placeholder="e.g. Gator Events Club"
                value={form.organization}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group full-width">
              <label>Tell us about your event(s)</label>
              <textarea
                name="message"
                rows={4}
                placeholder="Describe the type of events you plan to host, your target audience, and any other relevant details..."
                value={form.message}
                onChange={handleChange}
                required
              />
            </div>

            <button type="submit" className="btn-primary apply-btn">
              Apply for Event Host →
            </button>
          </form>
        ) : (
          <div className="success-box">
            <span className="success-icon">✅</span>
            <h2>Application Submitted!</h2>
            <p>Thanks, {form.name}! We'll review your application and reach out to <strong>{form.email}</strong> soon.</p>
            <button className="btn-secondary" onClick={() => navigate('/')}>Back to Home</button>
          </div>
        )}

        {/* Feature Cards */}
        <div className="cards host-cards">
          <div className="card">
            <div className="card-icon icon-blue">📈</div>
            <h3>Increase Attendance</h3>
            <p>Tap into our platform's audience and reach more attendees than ever before. Our discovery tools put your events in front of the right people at the right time.</p>
          </div>
          <div className="card">
            <div className="card-icon icon-green">🛡️</div>
            <h3>Security in Mind</h3>
            <p>Our host verification process ensures every event is legitimate, protecting your reputation and our community from fraudulent listings and unverified organizers.</p>
          </div>
          <div className="card">
            <div className="card-icon icon-pink">🎛️</div>
            <h3>Full Event Control</h3>
            <p>Manage RSVPs, post updates, and customize your event page — all from one intuitive dashboard built with hosts in mind.</p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default HostRegistrationPage;
