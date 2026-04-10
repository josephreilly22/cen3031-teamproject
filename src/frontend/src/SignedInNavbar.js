import { useNavigate } from 'react-router-dom';
import './DashboardPage.css';
import { clearAuthSession } from './authSession';

function SignedInNavbar({ title, actionLabel, actionPath, actions }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    clearAuthSession();
    navigate('/');
  };

  const buttons = actions || (actionLabel && actionPath ? [{ label: actionLabel, path: actionPath }] : []);

  return (
    <nav className="dashboard-navbar">
      <div className="logo signed-in-logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
        <img src="/logo.png" alt="Event Planner" className="logo-icon" />
        <span className="logo-text">Event Planners</span>
      </div>
      <span className="navbar-title">{title}</span>
      <div className="nav-buttons">
        {buttons.map(({ label, path }) => (
          <button key={path} className="nav-cta" onClick={() => navigate(path)}>{label}</button>
        ))}
        <button className="nav-logout" onClick={handleLogout}>Log Out</button>
      </div>
    </nav>
  );
}

export default SignedInNavbar;
