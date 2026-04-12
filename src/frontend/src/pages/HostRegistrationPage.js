import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import '../styles/App.css';
import '../styles/HostRegistrationPage.css';
import SiteNavbar from '../components/SiteNavbar';
import { getAuthSession } from '../utils/authSession';
import { normalizeTextInput } from '../utils/textInput';

function HostRegistrationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const session = getAuthSession();
  const hostDisplayName = [session.firstName, session.lastName].filter(Boolean).join(' ');
  const blockedRole = session.role === 'admin' || session.role === 'hoster';
  const blockedArticle = session.role === 'admin' ? 'an' : 'a';
  const blockedMessage = blockedRole ? `You can't register as ${blockedArticle} ${session.role}.` : '';
  const cameFromOnboarding = location.state?.from === 'onboarding';
  const backPath = cameFromOnboarding ? '/onboarding' : '/profile';
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    organization: '',
    message: '',
  });

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: normalizeTextInput(e.target.value, { multiline: e.target.name === 'message' }),
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (blockedRole) {
      setError(blockedMessage);
      return;
    }
    setError('');
    setLoading(true);

    try {
      const res = await fetch('http://localhost:8000/host-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: session.email,
          first_name: session.firstName,
          last_name: session.lastName,
          organization: form.organization,
          message: form.message,
        }),
      });
      const data = await res.json();

      if (data.success) {
        setSubmitted(true);
      } else {
        setError(data.message || 'Submission failed.');
      }
    } catch {
      setError('Could not connect to server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <SiteNavbar
        title="Host Registration"
        primaryLabel="← Back"
        primaryPath={backPath}
        secondaryLabel={cameFromOnboarding ? null : undefined}
        secondaryPath={cameFromOnboarding ? null : undefined}
      />

      <section className="hero">
        <h1 className="hero-heading">
          Host your next
          <br />
          <span className="highlight">big event with us.</span>
        </h1>

        <p className="hero-sub">
          Join a growing community of trusted event organizers. Submit an application
          to register as an event host and unlock greater outreach, verified visibility,
          and powerful tools to help your events thrive.
        </p>

        {blockedRole ? (
          <p className="host-error host-status-banner">⚠ {blockedMessage}</p>
        ) : (
          <p className="hosting-as-text">✓ You&apos;re hosting as {hostDisplayName} ({session.email})!</p>
        )}

        {!submitted ? (
          <form className={`host-form ${blockedRole ? 'host-form-blocked' : ''}`} onSubmit={handleSubmit}>
            <fieldset className="host-form-fieldset" disabled={blockedRole}>
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

              {error && <p className="host-error">{error}</p>}

              <button type="submit" className="btn-primary apply-btn" disabled={loading || blockedRole}>
                {loading ? 'Submitting...' : 'Apply for Event Host →'}
              </button>
            </fieldset>
          </form>
        ) : (
          <div className="success-box">
            <span className="success-icon">✅</span>
            <h2>Application Submitted!</h2>
            <p>
              Thanks, {session.firstName}! Your request is pending review. We&apos;ll notify
              you once an admin approves your application.
            </p>
            <button className="btn-secondary" onClick={() => navigate(backPath)}>
              {cameFromOnboarding ? '← Back to Onboarding' : '← Back to Profile'}
            </button>
          </div>
        )}

        <div className="cards host-cards">
          <div className="card">
            <div className="card-icon icon-blue">📈</div>
            <h3>Increase Attendance</h3>
            <p>
              Tap into our platform&apos;s audience and reach more attendees than ever before.
              Our discovery tools put your events in front of the right people at the right time.
            </p>
          </div>
          <div className="card">
            <div className="card-icon icon-green">🛡️</div>
            <h3>Security in Mind</h3>
            <p>
              Our host verification process ensures every event is legitimate, protecting your
              reputation and our community from fraudulent listings and unverified organizers.
            </p>
          </div>
          <div className="card">
            <div className="card-icon icon-pink">🎟️</div>
            <h3>Full Event Control</h3>
            <p>
              Manage RSVPs, post updates, and customize your event page, all from one intuitive
              dashboard built with hosts in mind.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default HostRegistrationPage;


