import { useNavigate } from 'react-router-dom';
import './App.css';
import { getAuthSession } from './authSession';

function SiteNavbar({
  primaryLabel,
  primaryPath,
  secondaryLabel = 'Sign In',
  secondaryPath = '/login',
}) {
  const navigate = useNavigate();
  const session = getAuthSession();

  const resolvedSecondaryLabel = session.signedIn ? 'Dashboard' : secondaryLabel;
  const resolvedSecondaryPath = session.signedIn ? '/dashboard' : secondaryPath;

  return (
    <nav className="navbar">
      <div className="logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
        <img src="/logo.png" alt="Event Planner" className="logo-icon" />
        <span className="logo-text">Event Planners</span>
      </div>
      <div className="nav-buttons">
        {primaryLabel && primaryPath && (
          <button className="btn-secondary nav-cta" onClick={() => navigate(primaryPath)}>{primaryLabel}</button>
        )}
        <button className="nav-register" onClick={() => navigate(resolvedSecondaryPath)}>{resolvedSecondaryLabel}</button>
      </div>
    </nav>
  );
}

export default SiteNavbar;
