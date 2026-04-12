import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import '../styles/App.css';
import { getAuthSession } from '../utils/authSession';

function SiteNavbar({
  title,
  primaryLabel,
  primaryPath,
  secondaryLabel,
  secondaryPath,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const session = getAuthSession();
  const [showTitleMask, setShowTitleMask] = useState(false);
  const [showLeftMask, setShowLeftMask] = useState(false);
  const [showRightMask, setShowRightMask] = useState(false);
  const navbarRef = useRef(null);
  const titleRef = useRef(null);
  const buttonsShellRef = useRef(null);
  const buttonsRef = useRef(null);
  const titleMaskActiveRef = useRef(false);
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

  const resolvedSecondaryLabel = session.signedIn
    ? (secondaryLabel === undefined ? 'Dashboard' : secondaryLabel)
    : (secondaryLabel === undefined ? 'Sign In' : secondaryLabel);
  const resolvedSecondaryPath = session.signedIn
    ? (secondaryPath === undefined
        ? (session.onboardingComplete ? '/dashboard' : '/onboarding')
        : secondaryPath)
    : (secondaryPath === undefined ? '/login' : secondaryPath);

  const getInitials = () => {
    const first = session.firstName?.[0] || '';
    const last = session.lastName?.[0] || '';
    const emailInitial = session.email?.[0] || 'U';
    return `${first}${last}`.trim() || emailInitial.toUpperCase();
  };

  const getGradientForUser = () => {
    const seed = session.email || session.firstName || session.lastName || 'user';
    let hash = 0;

    for (let index = 0; index < seed.length; index += 1) {
      hash = ((hash << 5) - hash) + seed.charCodeAt(index);
      hash |= 0;
    }

    const [start, end] = avatarGradients[Math.abs(hash) % avatarGradients.length];
    return `linear-gradient(135deg, ${start}, ${end})`;
  };

  useEffect(() => {
    const updateScrollMasks = () => {
      const buttonsNode = buttonsRef.current;
      if (!buttonsNode) {
        setShowLeftMask(false);
        setShowRightMask(false);
        return;
      }

      const maxScrollLeft = Math.max(0, buttonsNode.scrollWidth - buttonsNode.clientWidth);
      const scrollLeft = Math.max(0, buttonsNode.scrollLeft);
      const atRightEdge = maxScrollLeft - scrollLeft <= 1;
      const maskActive = titleMaskActiveRef.current;

      setShowLeftMask(maskActive && scrollLeft > 1);
      setShowRightMask(maskActive && !atRightEdge);
    };

    const measureNavbar = () => {
      const titleNode = titleRef.current;
      const buttonsShellNode = buttonsShellRef.current;
      const buttonsNode = buttonsRef.current;

      if (!titleNode || !buttonsShellNode || !buttonsNode) {
        setShowTitleMask(false);
        return;
      }

      const titleRect = titleNode.getBoundingClientRect();
      const buttonsShellRect = buttonsShellNode.getBoundingClientRect();
      const overlapWidth = Math.max(0, Math.ceil(titleRect.right + 18 - buttonsShellRect.left));
      const buttonsNeedScroll = buttonsNode.scrollWidth - buttonsShellNode.clientWidth > 1;
      const shouldMaskButtons = buttonsNeedScroll && overlapWidth > 0;
      const shellWidth = buttonsShellRect.width;
      const edgeWidth = Math.max(28, Math.min(72, Math.round(shellWidth * 0.1)));
      const fadeWidth = Math.max(36, Math.min(96, Math.round(shellWidth * 0.13)));

      buttonsShellNode.style.setProperty('--nav-shell-solid-width', `${Math.min(buttonsShellRect.width, overlapWidth)}px`);
      buttonsShellNode.style.setProperty('--nav-shell-edge-width', `${edgeWidth}px`);
      buttonsShellNode.style.setProperty('--nav-shell-mask-fade-width', `${fadeWidth}px`);
      buttonsShellNode.style.setProperty('--nav-shell-mask-width', `${Math.min(buttonsShellRect.width, overlapWidth + fadeWidth)}px`);
      titleMaskActiveRef.current = shouldMaskButtons;
      setShowTitleMask(shouldMaskButtons);

      window.requestAnimationFrame(updateScrollMasks);
    };

    measureNavbar();
    window.addEventListener('resize', measureNavbar);
    buttonsRef.current?.addEventListener('scroll', updateScrollMasks, { passive: true });

    let resizeObserver;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(measureNavbar);
      if (navbarRef.current) resizeObserver.observe(navbarRef.current);
      if (titleRef.current) resizeObserver.observe(titleRef.current);
      if (buttonsShellRef.current) resizeObserver.observe(buttonsShellRef.current);
      if (buttonsRef.current) resizeObserver.observe(buttonsRef.current);
    }

    return () => {
      window.removeEventListener('resize', measureNavbar);
      buttonsRef.current?.removeEventListener('scroll', updateScrollMasks);
      resizeObserver?.disconnect();
    };
  }, [location.pathname, primaryLabel, primaryPath, resolvedSecondaryLabel, resolvedSecondaryPath, session.signedIn, title]);

  useEffect(() => {
    const buttonsNode = buttonsRef.current;
    if (!buttonsNode) {
      return;
    }

    let firstFrameId = 0;
    let secondFrameId = 0;

    firstFrameId = window.requestAnimationFrame(() => {
      secondFrameId = window.requestAnimationFrame(() => {
        buttonsNode.scrollLeft = Math.max(0, buttonsNode.scrollWidth - buttonsNode.clientWidth);
      });
    });

    return () => {
      window.cancelAnimationFrame(firstFrameId);
      window.cancelAnimationFrame(secondFrameId);
    };
  }, [location.pathname, primaryLabel, primaryPath, resolvedSecondaryLabel, resolvedSecondaryPath, session.signedIn, title]);

  return (
    <nav ref={navbarRef} className="navbar">
      <div className="logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
        <img src="/logo.png" alt="Event Planner" className="logo-icon" />
        <span className="logo-text">Event Planners</span>
      </div>
      {title && <span ref={titleRef} className="site-navbar-title">{title}</span>}
      <div
        ref={buttonsShellRef}
        className={[
          'nav-buttons-shell',
          showTitleMask ? 'nav-buttons-shell--masked' : '',
          showLeftMask ? 'nav-buttons-shell--show-left-mask' : '',
          showRightMask ? 'nav-buttons-shell--show-right-mask' : '',
        ].filter(Boolean).join(' ')}
      >
        <div ref={buttonsRef} className="nav-buttons">
          {primaryLabel && primaryPath && (
            <button className="btn-secondary nav-cta" onClick={() => navigate(primaryPath)}>{primaryLabel}</button>
          )}
          {resolvedSecondaryLabel && resolvedSecondaryPath && (
            <button className="nav-register" onClick={() => navigate(resolvedSecondaryPath)}>{resolvedSecondaryLabel}</button>
          )}
          {session.signedIn && (
            <button
              type="button"
              className="nav-avatar"
              onClick={() => navigate('/profile')}
              aria-label="Profile"
              title="Profile"
              style={{ background: getGradientForUser() }}
            >
              {getInitials()}
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}

export default SiteNavbar;
