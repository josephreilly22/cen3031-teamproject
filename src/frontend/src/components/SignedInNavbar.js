import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import '../styles/DashboardPage.css';
import { getAuthSession, setOnboardingState, setUserRole } from '../utils/authSession';

function SignedInNavbar({ title, actionLabel, actionPath, actions, onBeforeNavigate, onBeforeLogout }) {
  const NAVBAR_TITLE_GAP_PX = 40;
  const NAVBAR_MASK_BUFFER_PX = 28;
  const NAVBAR_MIN_SHELL_WIDTH_PX = 180;
  const NAVBAR_SCROLL_TOLERANCE_PX = 1;
  const NAVBAR_RIGHT_EDGE_BUFFER_PX = 56;
  const navigate = useNavigate();
  const location = useLocation();
  const session = getAuthSession();
  const [role, setRole] = useState(session.role);
  const [onboardingComplete, setOnboardingComplete] = useState(session.onboardingComplete);
  const [showTitleMask, setShowTitleMask] = useState(false);
  const [showLeftMask, setShowLeftMask] = useState(false);
  const [showRightMask, setShowRightMask] = useState(false);
  const [animateMaskEdges, setAnimateMaskEdges] = useState(false);
  const navbarRef = useRef(null);
  const titleRef = useRef(null);
  const buttonsShellRef = useRef(null);
  const buttonsRef = useRef(null);
  const titleMaskActiveRef = useRef(false);
  const hasShownMaskRef = useRef(false);
  const measureFrameRef = useRef(0);
  const scrollFrameRef = useRef(0);
  const scrollFrameRef2 = useRef(0);
  const previousShellWidthRef = useRef(0);
  const buttons = (actions || (actionLabel && actionPath ? [{ label: actionLabel, path: actionPath }] : []))
    .filter(({ path }) => path !== '/profile');

  useEffect(() => {
    let cancelled = false;

    const syncSession = async () => {
      if (!session.signedIn || !session.email) {
        return;
      }

      try {
        const response = await fetch(`http://localhost:8000/profile?email=${encodeURIComponent(session.email)}`);
        const data = await response.json();

        if (!cancelled && data.success) {
          const nextRole = data.role || session.role || 'user';
          const nextOnboardingComplete = Boolean(data.onboarding_complete);

          setRole(nextRole);
          setOnboardingComplete(nextOnboardingComplete);
          setUserRole(nextRole);
          setOnboardingState(nextOnboardingComplete);
        }
      } catch {
        // Keep the cookie-backed session if the profile lookup fails.
      }
    };

    syncSession();

    return () => {
      cancelled = true;
    };
  }, [session.email, session.role, session.signedIn]);

  useLayoutEffect(() => {
    const buttonsNode = buttonsRef.current;

    const queueScrollButtonsToEnd = () => {
      window.cancelAnimationFrame(scrollFrameRef.current);
      window.cancelAnimationFrame(scrollFrameRef2.current);

      scrollFrameRef.current = window.requestAnimationFrame(() => {
        scrollFrameRef2.current = window.requestAnimationFrame(() => {
          syncButtonsToEnd();
        });
      });
    };

    const updateScrollMasks = () => {
      const buttonsNode = buttonsRef.current;
      if (!buttonsNode) {
        setShowLeftMask(false);
        setShowRightMask(false);
        return;
      }

      const maxScrollLeft = Math.max(0, buttonsNode.scrollWidth - buttonsNode.clientWidth);
      const scrollLeft = Math.max(0, buttonsNode.scrollLeft);
      const atRightEdge = maxScrollLeft - scrollLeft <= NAVBAR_SCROLL_TOLERANCE_PX;
      const scrollable = buttonsNode.scrollWidth - buttonsNode.clientWidth > 1;
      const maskActive = titleMaskActiveRef.current || scrollable;

      setShowLeftMask(maskActive && scrollLeft > 1);
      setShowRightMask(maskActive && (scrollable || !atRightEdge));
    };

    const syncButtonsToEnd = () => {
      const buttonsNode = buttonsRef.current;
      if (!buttonsNode) {
        return;
      }

      const maxScrollLeft = Math.max(0, buttonsNode.scrollWidth - buttonsNode.clientWidth);
      if (Math.abs(maxScrollLeft - buttonsNode.scrollLeft) <= NAVBAR_SCROLL_TOLERANCE_PX) {
        updateScrollMasks();
        return;
      }

      const previousScrollBehavior = buttonsNode.style.scrollBehavior;
      buttonsNode.style.scrollBehavior = 'auto';
      buttonsNode.scrollLeft = maxScrollLeft;
      buttonsNode.style.scrollBehavior = previousScrollBehavior;
      updateScrollMasks();
    };

    const runMeasureNavbar = () => {
      const navbarNode = navbarRef.current;
      const titleNode = titleRef.current;
      const buttonsShellNode = buttonsShellRef.current;
      const buttonsNode = buttonsRef.current;

      if (!navbarNode || !titleNode || !buttonsShellNode || !buttonsNode) {
        return;
      }

      const navbarRect = navbarNode.getBoundingClientRect();
      const titleRect = titleNode.getBoundingClientRect();
      const buttonsShellRect = buttonsShellNode.getBoundingClientRect();
      const shellRightInset = Math.max(0, Math.round(navbarRect.right - buttonsShellRect.right));
      const availableWidth = Math.floor(navbarRect.right - shellRightInset - titleRect.right - NAVBAR_TITLE_GAP_PX);
      const computedShellWidth = Math.max(NAVBAR_MIN_SHELL_WIDTH_PX, availableWidth);
      const effectiveShellWidth = Math.min(buttonsNode.scrollWidth, computedShellWidth);
      const predictedShellLeft = Math.round(navbarRect.right - shellRightInset - effectiveShellWidth);
      const overlapWidth = Math.max(
        0,
        Math.ceil(titleRect.right + NAVBAR_TITLE_GAP_PX + NAVBAR_MASK_BUFFER_PX - predictedShellLeft),
      );
      const buttonsNeedScroll = buttonsNode.scrollWidth - computedShellWidth > 1;
      const shouldMaskButtons = buttonsNeedScroll && overlapWidth > 0;
      const previousMaskState = titleMaskActiveRef.current;
      const previousShellWidth = previousShellWidthRef.current;
      const edgeWidth = Math.max(28, Math.min(72, Math.round(effectiveShellWidth * 0.1)));
      const fadeWidth = Math.max(36, Math.min(96, Math.round(effectiveShellWidth * 0.13)));

      buttonsShellNode.style.setProperty('--nav-shell-max-width', `${computedShellWidth}px`);
      buttonsShellNode.style.setProperty('--nav-shell-solid-width', `${Math.min(effectiveShellWidth, overlapWidth)}px`);
      buttonsShellNode.style.setProperty('--nav-shell-edge-width', `${edgeWidth}px`);
      buttonsShellNode.style.setProperty('--nav-shell-mask-fade-width', `${fadeWidth}px`);
      buttonsShellNode.style.setProperty('--nav-shell-mask-width', `${Math.min(effectiveShellWidth, overlapWidth + fadeWidth)}px`);
      buttonsShellNode.style.setProperty('--nav-shell-right-buffer-width', `${NAVBAR_RIGHT_EDGE_BUFFER_PX}px`);
      titleMaskActiveRef.current = shouldMaskButtons;
      previousShellWidthRef.current = computedShellWidth;
      setShowTitleMask(shouldMaskButtons);

      if (shouldMaskButtons && !hasShownMaskRef.current) {
        hasShownMaskRef.current = true;
        setAnimateMaskEdges(false);
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => setAnimateMaskEdges(true));
        });
      } else if (!shouldMaskButtons && !hasShownMaskRef.current) {
        setAnimateMaskEdges(false);
      }

      if (shouldMaskButtons && (!previousMaskState || Math.abs(previousShellWidth - computedShellWidth) > 24)) {
        queueScrollButtonsToEnd();
      } else if (buttonsNeedScroll) {
        queueScrollButtonsToEnd();
      } else {
        window.requestAnimationFrame(updateScrollMasks);
      }
    };

    const scheduleMeasureNavbar = () => {
      window.cancelAnimationFrame(measureFrameRef.current);
      measureFrameRef.current = window.requestAnimationFrame(runMeasureNavbar);
    };

    runMeasureNavbar();
    window.addEventListener('resize', scheduleMeasureNavbar);
    buttonsNode?.addEventListener('scroll', updateScrollMasks, { passive: true });

    let resizeObserver;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(scheduleMeasureNavbar);
      if (navbarRef.current) resizeObserver.observe(navbarRef.current);
      if (titleRef.current) resizeObserver.observe(titleRef.current);
      if (buttonsShellRef.current) resizeObserver.observe(buttonsShellRef.current);
    }

    return () => {
      window.removeEventListener('resize', scheduleMeasureNavbar);
      buttonsNode?.removeEventListener('scroll', updateScrollMasks);
      window.cancelAnimationFrame(measureFrameRef.current);
      window.cancelAnimationFrame(scrollFrameRef.current);
      window.cancelAnimationFrame(scrollFrameRef2.current);
      resizeObserver?.disconnect();
    };
  }, [buttons.length, onboardingComplete, role, title]);

  useLayoutEffect(() => {
    const buttonsNode = buttonsRef.current;
    const resizeNow = () => {
      if (!buttonsNode) {
        return;
      }

      const previousScrollBehavior = buttonsNode.style.scrollBehavior;
      buttonsNode.style.scrollBehavior = 'auto';
      buttonsNode.scrollLeft = Math.max(0, buttonsNode.scrollWidth - buttonsNode.clientWidth);
      buttonsNode.style.scrollBehavior = previousScrollBehavior;
    };

    resizeNow();
    window.cancelAnimationFrame(scrollFrameRef.current);
    window.cancelAnimationFrame(scrollFrameRef2.current);

    scrollFrameRef.current = window.requestAnimationFrame(() => {
      scrollFrameRef2.current = window.requestAnimationFrame(() => {
        resizeNow();
      });
    });

    return () => {
      window.cancelAnimationFrame(scrollFrameRef.current);
      window.cancelAnimationFrame(scrollFrameRef2.current);
    };
  }, [location.pathname, buttons.length, onboardingComplete, role, title]);

  const guardedNavigate = (path) => {
    if (onBeforeNavigate && onBeforeNavigate(path) === false) {
      return;
    }
    navigate(path);
  };

  const resolvePath = (path) => {
    if (path === '/dashboard' && !onboardingComplete) {
      return '/onboarding';
    }
    return path;
  };

  const resolveProfilePath = () => {
    if (!onboardingComplete) {
      return '/onboarding';
    }
    return '/profile';
  };

  const getInitials = () => {
    const first = session.firstName?.[0] || '';
    const last = session.lastName?.[0] || '';
    const emailInitial = session.email?.[0] || 'U';
    return `${first}${last}`.trim() || emailInitial.toUpperCase();
  };

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

  return (
    <nav
      ref={navbarRef}
      className={`dashboard-navbar ${showTitleMask ? 'dashboard-navbar-title-mask' : ''}`}
    >
      <div className="logo signed-in-logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
        <img src="/logo.png" alt="EventPlanner8" className="logo-icon" />
        <span className="logo-text">EventPlanner8</span>
      </div>
      <span ref={titleRef} className="navbar-title">{title}</span>
      <div
        ref={buttonsShellRef}
        className={[
          'nav-buttons-shell',
          showTitleMask ? 'nav-buttons-shell--masked' : '',
          showLeftMask ? 'nav-buttons-shell--show-left-mask' : '',
          showRightMask ? 'nav-buttons-shell--show-right-mask' : '',
          animateMaskEdges ? 'nav-buttons-shell--animate-masks' : '',
        ].filter(Boolean).join(' ')}
      >
        <div ref={buttonsRef} className="nav-buttons">
          {(role === 'hoster' || role === 'admin') && (
            <button className="nav-cta" onClick={() => guardedNavigate('/my-events')}>My Events</button>
          )}
          {role === 'admin' && (
            <button className="nav-cta" onClick={() => guardedNavigate('/admin')}>Admin Dashboard</button>
          )}
          {buttons.map(({ label, path }) => (
            <button
              key={path}
              className={path === '/dashboard' ? 'nav-primary' : 'nav-cta'}
              onClick={() => guardedNavigate(resolvePath(path))}
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            className="nav-avatar"
            onClick={() => guardedNavigate(resolveProfilePath())}
            aria-label="Profile"
            title="Profile"
            style={{ background: getGradientForUser() }}
          >
            {getInitials()}
          </button>
        </div>
      </div>
    </nav>
  );
}

export default SignedInNavbar;
