import { useNavigate } from 'react-router-dom';
import './Placeholder.css';

function OnboardingPage() {
  const navigate = useNavigate();

  return (
    <div className="placeholder-page">
      <button className="back-btn" onClick={() => navigate('/')}>← Back</button>
      <img src="/logo.png" alt="Event Planner" style={{ height: 48, marginBottom: 8 }} />
      <h1>Onboarding Coming Soon</h1>
      <p>We're working on personalizing your experience. Check back soon!</p>
      <button
        onClick={() => navigate('/dashboard')}
        style={{
          marginTop: 16,
          background: '#3b3fa0',
          color: '#fff',
          border: 'none',
          borderRadius: 50,
          padding: '12px 28px',
          fontSize: '1rem',
          fontWeight: 600,
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        Go to Dashboard
      </button>
    </div>
  );
}

export default OnboardingPage;
