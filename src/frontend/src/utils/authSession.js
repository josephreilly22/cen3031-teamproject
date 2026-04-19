// Session/cookie management duration (days)
const COOKIE_DAYS = 7;

// Helper function - set cookie with expiration
function setCookie(name, value, days = COOKIE_DAYS) {
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/`;
}

// Helper function - retrieve cookie value by name
function getCookie(name) {
  const prefix = `${name}=`;
  const entry = document.cookie.split('; ').find((item) => item.startsWith(prefix));
  return entry ? decodeURIComponent(entry.slice(prefix.length)) : '';
}

// Helper function - clear cookie by name
function clearCookie(name) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;  
}

// Store user email and password in session cookies
export function setAuthSession(email, password) {
  setCookie('session_email', email);
  setCookie('session_password', password);
}

// Store user role in cookie
export function setUserRole(role) {
  setCookie('user_role', role);
}

// Store user name in cookies
export function setUserName(firstName, lastName) {
  setCookie('user_first_name', firstName);
  setCookie('user_last_name', lastName);
}

// Store onboarding completion status (longer duration: 365 days)
export function setOnboardingState(onboardingComplete) {
  setCookie('onboarding_complete', onboardingComplete ? 'true' : 'false', 365); 
}

// Get current user session data from cookies
export function getAuthSession() {
  const email = getCookie('session_email');
  const password = getCookie('session_password');
  const onboardingComplete = getCookie('onboarding_complete') === 'true';       
  const role = getCookie('user_role') || 'user';

  const firstName = getCookie('user_first_name');
  const lastName = getCookie('user_last_name');

  return {
    email,
    password,
    signedIn: Boolean(email && password),
    onboardingComplete,
    role,
    firstName,
    lastName,
    fullName: [firstName, lastName].filter(Boolean).join(' '),
  };
}

// Clear all session cookies (logout)
export function clearAuthSession() {
  clearCookie('session_email');
  clearCookie('session_password');
  clearCookie('user_role');
  clearCookie('user_first_name');
  clearCookie('user_last_name');
  clearCookie('onboarding_complete');
  clearCookie('onboarding_complete_email');
}
