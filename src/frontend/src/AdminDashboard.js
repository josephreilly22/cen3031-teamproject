import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminDashboard.css';
import SignedInNavbar from './SignedInNavbar';
import { getAuthSession, setUserRole } from './authSession';

function AdminDashboard() {
  const navigate = useNavigate();
  const session = getAuthSession();
  const [requests, setRequests] = useState([]);
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
      .finally(() => setLoading(false));
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

  return (
    <div className="admin-dashboard">
      <SignedInNavbar title="Admin Dashboard" actionLabel="Dashboard" actionPath="/dashboard" />

      <main className="admin-content">
        <div className="admin-header">
          <h1 className="admin-heading">Admin Dashboard</h1>
          <p className="admin-sub">Review and manage incoming event host registration requests.</p>
        </div>

        <div className="admin-info-box">
          <p className="admin-info-title">🛠 Manually change a user's role</p>
          <p className="admin-info-desc">Run the following from <code>src/backend/</code> using the project's virtual environment:</p>
          <pre className="admin-info-code">{`# List all users and their current roles
../../.venv/bin/python set_role.py

# Set a specific role  (normal | event-host | admin)
../../.venv/bin/python set_role.py <email> <role>

# Example
../../.venv/bin/python set_role.py user@example.com admin`}</pre>
        </div>

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
                  <div className="request-avatar">
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
