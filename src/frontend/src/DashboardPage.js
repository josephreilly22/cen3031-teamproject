import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './DashboardPage.css';
import SignedInNavbar from './SignedInNavbar';
import { getAuthSession } from './authSession';

function DashboardPage() {
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
      <SignedInNavbar title="Dashboard" actions={[{ label: 'Onboarding', path: '/onboarding' }, { label: 'Profile', path: '/profile' }]} />

      <main className="dashboard-content dashboard-placeholder-content">
        <section className="dashboard-placeholder-card">
          <h1>Dashboard</h1>
          <p>Signed in as <strong>{session.email}</strong>.</p>
          <p className="dashboard-placeholder-note">This page is still work in progress.</p>
        </section>
      </main>
    </div>
  );
}

export default DashboardPage;
