import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import '../styles/CreateEventPage.css';
import SignedInNavbar from '../components/SignedInNavbar';
import { getAuthSession } from '../utils/authSession';

const REPORT_REASONS = [
  'Spam',
  'Harassment',
  'Explicit',
  'Irrelevant',
  'Other',
];

function ReportEventPage() {
  const navigate = useNavigate();
  const { eventId } = useParams();
  const session = getAuthSession();
  const [eventTitle, setEventTitle] = useState('');
  const [selectedReason, setSelectedReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reportStatus, setReportStatus] = useState('loading');

  useEffect(() => {
    if (!session.signedIn) {
      navigate('/login');
      return;
    }

    fetch(`http://localhost:8000/events/${encodeURIComponent(eventId)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          const event = data.event || null;
          if (event?.owner_email === session.email) {
            navigate(`/dashboard/${encodeURIComponent(eventId)}`);
            return;
          }

          setEventTitle(event?.title || '');
        }
      })
      .catch(() => {});

    fetch(`http://localhost:8000/events/${encodeURIComponent(eventId)}/report?reporter_email=${encodeURIComponent(session.email)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.exists) {
          setReportStatus('already_reported');
        } else {
          setReportStatus('ready');
        }
      })
      .catch(() => {
        setReportStatus('ready');
      });
  }, [eventId, navigate, session.email, session.signedIn]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!selectedReason || submitting) {
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`http://localhost:8000/events/${encodeURIComponent(eventId)}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reporter_email: session.email,
          reason: selectedReason,
        }),
      });
      const data = await response.json();

      if (data.success) {
        setReportStatus(data.already_reported ? 'already_reported' : 'submitted');
        return;
      }

      if (data.message) {
        window.alert(data.message);
      }
    } catch {
      window.alert('Could not connect to server.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!session.signedIn) return null;

  if (reportStatus === 'submitted' || reportStatus === 'already_reported') {
    const alreadyReported = reportStatus === 'already_reported';

    return (
      <div className="create-event-page">
        <SignedInNavbar title="Report Event" actionLabel="Dashboard" actionPath="/dashboard" />

        <main className="create-event-content report-event-content">
          <div className="create-event-success report-success-box">
            <span className="create-event-success-icon">✅</span>
            <h2>{alreadyReported ? 'Report Already Submitted!' : 'Report Submitted!'}</h2>
            <p>
              {alreadyReported
                ? 'We already have this report on file. The admins will be notified.'
                : 'Thanks for letting us know. The admins will be notified.'}
            </p>
            <button className="ce-btn-secondary" onClick={() => navigate(`/dashboard/${encodeURIComponent(eventId)}`)}>
              {'\u2190'} Back to Event
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (reportStatus === 'loading') {
    return null;
  }

  return (
    <div className="create-event-page">
      <SignedInNavbar title="Report Event" actionLabel="Dashboard" actionPath="/dashboard" />

      <main className="create-event-content report-event-content">
        <button type="button" className="report-back-btn" onClick={() => navigate(`/dashboard/${encodeURIComponent(eventId)}`)}>
          {'\u2190'} Back
        </button>

        <div className="create-event-header">
          <h1 className="create-event-heading">Report {eventTitle || 'Event'}?</h1>
          <p className="create-event-sub">
            Do you want to report this event to the admins?
          </p>
        </div>

        <form className="create-event-form report-event-form" onSubmit={handleSubmit} noValidate>
          <div className="ce-field report-event-field">
            <label>Reason</label>
            <div className="report-event-reasons" role="listbox" aria-label="Report reasons">
              {REPORT_REASONS.map((reason) => (
                <button
                  key={reason}
                  type="button"
                  className={`event-type-btn report-reason-btn ${selectedReason === reason ? 'active' : ''}`}
                  onClick={() => setSelectedReason(reason)}
                  aria-pressed={selectedReason === reason}
                >
                  {reason}
                </button>
              ))}
            </div>
          </div>

          <div className="ce-actions report-event-actions">
            <button
              type="submit"
              className="ce-btn-primary report-submit-btn"
              disabled={!selectedReason || submitting}
            >
              {submitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

export default ReportEventPage;
