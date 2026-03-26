import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './App.css';
import './DashboardPage.css';
import './ProfilePage.css';
import SignedInNavbar from './SignedInNavbar';
import { getAuthSession } from './authSession';

function ProfilePage() {
  const navigate = useNavigate();
  const session = getAuthSession();

  useEffect(() => {
    if (!session.signedIn) {
      navigate('/login');
    }
  }, [navigate, session.signedIn]);

  if (!session.signedIn) {
    return null;
  }

  return (
    <div className="dashboard">
      <SignedInNavbar title="Profile" actionLabel="Dashboard" actionPath="/dashboard" />

      <main className="dashboard-content profile-content">
        <section className="profile-card">
          <h1>Profile</h1>
          <p>Signed in as <strong>{session.email}</strong>.</p>
          <p className="profile-note">This page is still work in progress.</p>
        </section>

        <div className="profile-actions">
          <button className="btn-primary" onClick={() => navigate('/dashboard')}>← Go Back</button>
        </div>
      </main>
    </div>
  );
}

export default ProfilePage;
