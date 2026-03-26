import { useNavigate } from 'react-router-dom';
import './App.css';

function SiteNavbar({
  primaryLabel = 'Register as a host',
  primaryPath = '/hostregistration',
  secondaryLabel = 'Login',
  secondaryPath = '/login',
}) {
  const navigate = useNavigate();

  return (
    <nav className="navbar">
      <div className="logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
        <img src="/logo.png" alt="Event Planner" className="logo-icon" />
        <span className="logo-text">Event Planners</span>
      </div>
      <div className="nav-buttons">
        <button className="nav-register" onClick={() => navigate(primaryPath)}>{primaryLabel}</button>
        <button className="btn-secondary nav-cta" onClick={() => navigate(secondaryPath)}>{secondaryLabel}</button>
      </div>
    </nav>
  );
}

export default SiteNavbar;
