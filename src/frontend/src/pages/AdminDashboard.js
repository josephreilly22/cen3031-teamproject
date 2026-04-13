import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/AdminDashboard.css';
import SignedInNavbar from '../components/SignedInNavbar';
import { getAuthSession } from '../utils/authSession';

function AdminDashboard() {
  const navigate = useNavigate();
  const session = getAuthSession();
  const [requests, setRequests] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [hosters, setHosters] = useState([]);
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportActionLoading, setReportActionLoading] = useState('');
  const [reportActionError, setReportActionError] = useState('');
  const [showReporters, setShowReporters] = useState(false);

  const avatarGradients = [
    ['#4f7ed8', '#8a7ae6'],
    ['#3b8ea5', '#6ec6ca'],
    ['#d46a6a', '#f0a6a6'],
    ['#5b9bd5', '#7a89f0'],
    ['#3d7f6f', '#77b28c'],
    ['#9a6ad6', '#d58edc'],
    ['#4f6bd8', '#d07ca6'],
    ['#4d8f5f', '#b0c96e'],
  ];

  const getGradientForUser = (seedValue) => {
    const seed = seedValue || 'user';
    let hash = 0;
    for (let index = 0; index < seed.length; index += 1) {
      hash = ((hash << 5) - hash) + seed.charCodeAt(index);
      hash |= 0;
    }

    const [start, end] = avatarGradients[Math.abs(hash) % avatarGradients.length];
    return `linear-gradient(135deg, ${start}, ${end})`;
  };

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [requestsRes, usersRes, reportsRes] = await Promise.all([
        fetch('http://localhost:8000/admin/host-requests'),
        fetch('http://localhost:8000/admin/users'),
        fetch(`http://localhost:8000/admin/reports?email=${encodeURIComponent(session.email)}`),
      ]);

      const [requestsData, usersData, reportsData] = await Promise.all([
        requestsRes.json(),
        usersRes.json(),
        reportsRes.json(),
      ]);

      if (requestsData.success) {
        setRequests((requestsData.requests || []).map((request) => request.value));
      }

      if (usersData.success) {
        setAdmins(usersData.admins || []);
        setHosters(usersData.hosters || []);
      }

      if (reportsData.success) {
        setReports(reportsData.reports || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!session.signedIn) {
      navigate('/login');
      return;
    }

    if (session.role !== 'admin') {
      navigate('/dashboard');
      return;
    }

    loadAdminData();
  }, [navigate, session.email, session.role, session.signedIn]);

  const reportBars = useMemo(() => {
    const counts = selectedReport?.reason_counts || {};
    const entries = Object.entries(counts);
    const maxCount = Math.max(1, ...entries.map(([, count]) => Number(count) || 0));
    return entries.map(([reason, count]) => ({
      reason,
      count: Number(count) || 0,
      width: `${((Number(count) || 0) / maxCount) * 100}%`,
    }));
  }, [selectedReport]);

  if (!session.signedIn || session.role !== 'admin') return null;

  const fetchReportDetail = async (eventId) => {
    setReportLoading(true);
    setReportActionError('');
    try {
      const response = await fetch(`http://localhost:8000/admin/reports/${encodeURIComponent(eventId)}?email=${encodeURIComponent(session.email)}`);
      const data = await response.json();
      if (data.success) {
        setSelectedReport(data.report || null);
        setShowReporters(false);
      } else {
        setReportActionError(data.message || 'This report no longer exists');
      }
    } catch {
      setReportActionError('This report no longer exists');
    } finally {
      setReportLoading(false);
    }
  };

  const handleApprove = async (email) => {
    const res = await fetch(`http://localhost:8000/admin/approve/${encodeURIComponent(email)}`, { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      setRequests((prev) => prev.filter((request) => request.email !== email));
      loadAdminData();
    }
  };

  const handleDeny = async (email) => {
    const res = await fetch(`http://localhost:8000/admin/deny/${encodeURIComponent(email)}`, { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      setRequests((prev) => prev.filter((request) => request.email !== email));
    }
  };

  const handleRemove = async (email) => {
    const res = await fetch('http://localhost:8000/admin/remove', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (data.success) {
      setHosters((prev) => prev.filter((user) => user.email !== email));
    }
  };

  const handleReportAction = async (path) => {
    if (!selectedReport?.event_id || reportActionLoading) {
      return;
    }

    setReportActionLoading(path);
    setReportActionError('');
    try {
      const response = await fetch(`http://localhost:8000/admin/reports/${encodeURIComponent(selectedReport.event_id)}/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: session.email }),
      });
      const data = await response.json();
      if (data.success) {
        setSelectedReport(null);
        setShowReporters(false);
        setReportActionError('');
        await loadAdminData();
      } else {
        setReportActionError(data.message || 'This report no longer exists');
        await loadAdminData();
      }
    } catch {
      setReportActionError('This report no longer exists');
    } finally {
      setReportActionLoading('');
    }
  };

  return (
    <div className="admin-dashboard">
      <SignedInNavbar title="Admin Dashboard" actionLabel="Dashboard" actionPath="/dashboard" />

      <main className="admin-content">
        <div className="admin-header">
          <h1 className="admin-heading">Admin Dashboard</h1>
          <p className="admin-sub">Review host requests, moderation reports, and admin-level account changes.</p>
        </div>

        <div className="admin-info-box">
          <p className="admin-info-title">Command guide</p>
          <p className="admin-info-desc">
            Run this from the project root to list the available backend commands.
          </p>
          <pre className="admin-info-code">{`WindowsOS:
.\\.venv\\Scripts\\python.exe .\\src\\backend\\cmds\\cmd.py

MacOS:
./.venv/bin/python src/backend/cmds/cmd.py`}</pre>
        </div>

        {!loading && (
          <>
            <section className="admin-role-section">
              <h2 className="admin-role-heading">Admins</h2>
              {admins.length === 0 ? (
                <div className="admin-empty admin-empty--compact">
                  <span className="admin-empty-icon" aria-hidden="true">{"\u{1F451}"}</span>
                  <p>No admins found.</p>
                </div>
              ) : (
                <div className="admin-user-list">
                  {admins.map((user) => (
                    <div className="admin-user-row" key={user.email}>
                      <div className="admin-user-left">
                        <div
                          className="request-avatar admin-user-avatar"
                          style={{ background: getGradientForUser(user.email) }}
                        >
                          {user.first_name?.[0]}{user.last_name?.[0]}
                        </div>
                        <div>
                          <p className="admin-user-name">{user.first_name} {user.last_name}</p>
                          <p className="admin-user-email">{user.email}</p>
                        </div>
                      </div>
                      <span className="admin-user-tag">Admin</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="admin-role-section">
              <h2 className="admin-role-heading">Hosters</h2>
              {hosters.length === 0 ? (
                <div className="admin-empty admin-empty--compact">
                  <span className="admin-empty-icon" aria-hidden="true">{"\u{1F4E3}"}</span>
                  <p>No hosters found.</p>
                </div>
              ) : (
                <div className="admin-user-list">
                  {hosters.map((user) => (
                    <div className="admin-user-row" key={user.email}>
                      <div className="admin-user-left">
                        <div
                          className="request-avatar admin-user-avatar"
                          style={{ background: getGradientForUser(user.email) }}
                        >
                          {user.first_name?.[0]}{user.last_name?.[0]}
                        </div>
                        <div>
                          <p className="admin-user-name">{user.first_name} {user.last_name}</p>
                          <p className="admin-user-email">{user.email}</p>
                          <p className="admin-user-org">{user.organization || 'No organization listed'}</p>
                        </div>
                      </div>
                      <button className="deny-btn" onClick={() => handleRemove(user.email)}>
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        <section className="admin-role-section">
          <h2 className="admin-role-heading">Event Host Requests</h2>
          {loading ? (
            <p className="admin-loading">Loading requests...</p>
          ) : requests.length === 0 ? (
            <div className="admin-empty admin-empty--compact">
              <span className="admin-empty-icon" aria-hidden="true">{"\u{1F4ED}"}</span>
              <p>No pending host requests.</p>
            </div>
          ) : (
            <div className="request-grid">
              {requests.map((req) => (
                <div className="request-tile" key={req.email}>
                  <div className="request-tile-header">
                    <div
                      className="request-avatar"
                      style={{ background: getGradientForUser(req.email) }}
                    >
                      {req.first_name?.[0]}{req.last_name?.[0]}
                    </div>
                    <div>
                      <p className="request-name">{req.first_name} {req.last_name}</p>
                      <p className="request-email">{req.email}</p>
                    </div>
                  </div>

                  <div className="request-field">
                    <span className="request-label">Organization</span>
                    <span className="request-value">{req.organization}</span>
                  </div>

                  <div className="request-field">
                    <span className="request-label">Request</span>
                    <span className="request-value request-message">{req.message}</span>
                  </div>

                  <div className="request-actions">
                    <button className="approve-btn" onClick={() => handleApprove(req.email)}>
                      Approve
                    </button>
                    <button className="deny-btn" onClick={() => handleDeny(req.email)}>
                      Deny
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="admin-role-section">
          <div className="admin-reports-header">
            <h2 className="admin-role-heading admin-role-heading--danger">Reports</h2>
            <span className="admin-report-total">{reports.length} active</span>
          </div>

          {loading ? (
            <p className="admin-loading">Loading reports...</p>
          ) : reports.length === 0 ? (
            <div className="admin-empty admin-empty--compact">
              <span className="admin-empty-icon" aria-hidden="true">{"\u2705"}</span>
              <p>There are no pending reports.</p>
            </div>
          ) : (
            <div className="admin-report-strip">
              {reports.map((report) => (
                <div key={report.event_id} className="admin-report-item">
                  <div className="admin-report-item-main">
                    <div>
                      <p className="admin-report-item-label">Reported Event</p>
                      <p className="admin-report-item-title">{report.event_title}</p>
                    </div>
                    <div className="admin-report-count">
                      <span className="admin-report-count-value">{report.total_reports}</span>
                      <span className="admin-report-count-label">total reports</span>
                    </div>
                  </div>
                  <div className="admin-report-item-actions">
                    <button
                      type="button"
                      className="admin-report-view-event"
                      onClick={() => navigate(`/dashboard/${encodeURIComponent(report.event_id)}`)}
                      disabled={!report.event_exists}
                    >
                      View Event
                    </button>
                    <button
                      type="button"
                      className="admin-report-view-report"
                      onClick={() => fetchReportDetail(report.event_id)}
                    >
                      View Report
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {(reportLoading || selectedReport) && (
          <section className="admin-report-detail">
            {reportLoading ? (
              <p className="admin-loading">Loading report details...</p>
            ) : selectedReport ? (
              <>
                <div className="admin-report-detail-header">
                  <div>
                    <p className="admin-report-detail-kicker">Report Breakdown</p>
                    <h3 className="admin-report-detail-title">{selectedReport.event_title}</h3>
                  </div>
                  <button
                    type="button"
                    className="admin-report-back"
                    onClick={() => {
                      setSelectedReport(null);
                      setShowReporters(false);
                      setReportActionError('');
                    }}
                  >
                    Close
                  </button>
                </div>

                <div className="admin-report-bars">
                  {reportBars.map((bar) => (
                    <div key={bar.reason} className="admin-report-bar-row">
                      <div className="admin-report-bar-meta">
                        <span>{bar.reason}</span>
                        <span>{bar.count}</span>
                      </div>
                      <div className="admin-report-bar-track">
                        <div className="admin-report-bar-fill" style={{ width: bar.width }} />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="admin-report-reporters">
                  <div className="admin-report-reporters-header">
                    <p className="admin-report-detail-kicker">Reporters</p>
                    <div className="admin-report-reporters-actions">
                      <span className="admin-report-reporters-total">{selectedReport.reporters?.length || 0} total</span>
                      {Boolean(selectedReport.reporters?.length) && (
                        <button
                          type="button"
                          className="admin-report-reporters-toggle"
                          onClick={() => setShowReporters((current) => !current)}
                        >
                          {showReporters ? 'Hide individual reporters' : 'Show individual reporters'}
                        </button>
                      )}
                    </div>
                  </div>
                  {showReporters && selectedReport.reporters?.length ? (
                    <div className="admin-report-reporter-list">
                      {selectedReport.reporters.map((reporter, index) => (
                        <div key={`${reporter.email}-${reporter.created_at}-${index}`} className="admin-report-reporter-card">
                          <div className="admin-report-reporter-main">
                            <p className="admin-report-reporter-name">{reporter.first_name} {reporter.last_name}</p>
                            <p className="admin-report-reporter-email">{reporter.email || 'N/A'}</p>
                          </div>
                          <div className="admin-report-reporter-meta">
                            <span className={`admin-report-reporter-status ${reporter.deleted ? 'admin-report-reporter-status--deleted' : ''}`}>
                              {reporter.deleted ? 'Deleted Account' : reporter.role}
                            </span>
                            <span className="admin-report-reporter-reason">{reporter.reason}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : selectedReport.reporters?.length ? (
                    <p className="admin-empty-inline">Individual reporters are hidden.</p>
                  ) : (
                    <p className="admin-empty-inline">No reporter details available.</p>
                  )}
                </div>

                {reportActionError && (
                  <p className="admin-report-error">{"\u26A0"} {reportActionError}</p>
                )}

                <div className="admin-report-detail-actions">
                  <button
                    type="button"
                    className="admin-report-resolve-btn"
                    onClick={() => handleReportAction('resolve')}
                    disabled={Boolean(reportActionLoading)}
                  >
                    {reportActionLoading === 'resolve' ? 'Resolving...' : 'Resolve Report'}
                  </button>
                  <button
                    type="button"
                    className="admin-report-remove-btn"
                    onClick={() => handleReportAction('remove-event')}
                    disabled={Boolean(reportActionLoading)}
                  >
                    {reportActionLoading === 'remove-event' ? 'Removing...' : 'Remove Event'}
                  </button>
                  <button
                    type="button"
                    className="admin-report-remove-btn"
                    onClick={() => handleReportAction('remove-event-hoster')}
                    disabled={Boolean(reportActionLoading)}
                  >
                    {reportActionLoading === 'remove-event-hoster' ? 'Removing...' : 'Remove Event and Hoster'}
                  </button>
                </div>
              </>
            ) : null}
          </section>
        )}
      </main>
    </div>
  );
}

export default AdminDashboard;
