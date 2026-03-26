import { useNavigate } from 'react-router-dom';
import './DashboardPage.css';

function DashboardPage() {
  const navigate = useNavigate();

  return (
    <div className="dashboard">
      <nav className="dashboard-navbar">
        <div className="logo" onClick={() => navigate('/')}>
          <img src={require('./assets/EventPlannerIcon.png')} alt="Event Planner" className="logo-icon" />
          <span className="logo-text">Event Planners</span>
        </div>
        <span className="navbar-title">Dashboard</span>
        <div className="nav-buttons">
          <button className="nav-cta" onClick={() => navigate('/profile')}>Profile</button>
          <button className="nav-logout" onClick={() => navigate('/')}>Log Out</button>
        </div>
      </nav>

      <main className="dashboard-content">
      </main>
    </div>
  );
}

export default DashboardPage;
