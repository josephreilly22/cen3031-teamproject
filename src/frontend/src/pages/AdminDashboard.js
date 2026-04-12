import { useEffect, useState } from 'react';
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session.signedIn) { navigate('/login'); return; }
    if (session.role !== 'admin') { navigate('/dashboard'); return; }

    fetch('http://localhost:8000/admin/host-requests')
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setRequests(data.requests.map((r) => r.value));
        }
      })
      .catch(() => {})
      .finally(() => {
        fetch('http://localhost:8000/admin/users')
          .then((r) => r.json())
          .then((data) => {
            if (data.success) {
              setAdmins(data.admins || []);
              setHosters(data.hosters || []);
            }
          })
          .catch(() => {})
          .finally(() => setLoading(false));
      });
  }, [navigate, session.signedIn, session.role]);

  if (!session.signedIn || session.role !== 'admin') return null;

  const handleApprove = async (email) => {
    const res = await fetch(`http://localhost:8000/admin/approve/${encodeURIComponent(email)}`, { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      setRequests((prev) => prev.filter((r) => r.email !== email));
    }
  };

  const handleDeny = async (email) => {
    const res = await fetch(`http://localhost:8000/admin/deny/${encodeURIComponent(email)}`, { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      setRequests((prev) => prev.filter((r) => r.email !== email));
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

  return (
    <div className="admin-dashboard">
      <SignedInNavbar title="Admin Dashboard" actionLabel="Dashboard" actionPath="/dashboard" />

      <main className="admin-content">
        <div className="admin-header">
          <h1 className="admin-heading">Admin Dashboard</h1>
          <p className="admin-sub">Review and manage incoming event host registration requests.</p>
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
                <p className="admin-empty-inline">No admins found.</p>
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
                <p className="admin-empty-inline">No hosters found.</p>
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

        {loading ? (
          <p className="admin-loading">Loading requests...</p>
        ) : requests.length === 0 ? (
          <div className="admin-empty">
            <span className="admin-empty-icon">📭</span>
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
      </main>
    </div>
  );
}

export default AdminDashboard;


