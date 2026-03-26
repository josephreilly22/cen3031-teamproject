import { useNavigate } from 'react-router-dom';
import './DashboardPage.css';
import { clearAuthSession } from './authSession';

function SignedInNavbar({ title, actionLabel, actionPath }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    clearAuthSession();
    navigate('/');
  };

  return (
    <nav className="dashboard-navbar">
      <div className="logo signed-in-logo">
        <img src="/logo.png" alt="Event Planner" className="logo-icon" />
        <span className="logo-text">Event Planners</span>
      </div>
      <span className="navbar-title">{title}</span>
      <div className="nav-buttons">
        {actionLabel && actionPath ? (
          <button className="nav-cta" onClick={() => navigate(actionPath)}>{actionLabel}</button>
        ) : null}
        <button className="nav-logout" onClick={handleLogout}>Log Out</button>
      </div>
    </nav>
  );
}

export default SignedInNavbar;
