const COOKIE_DAYS = 7;

function setCookie(name, value, days = COOKIE_DAYS) {
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/`;
}

function getCookie(name) {
  const prefix = `${name}=`;
  const entry = document.cookie.split('; ').find((item) => item.startsWith(prefix));
  return entry ? decodeURIComponent(entry.slice(prefix.length)) : '';
}

function clearCookie(name) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}

export function setAuthSession(email, password) {
  setCookie('session_email', email);
  setCookie('session_password', password);
}

export function setUserRole(role) {
  setCookie('user_role', role);
}

export function setUserName(firstName, lastName) {
  setCookie('user_first_name', firstName);
  setCookie('user_last_name', lastName);
}

export function getAuthSession() {
  const email = getCookie('session_email');
  const password = getCookie('session_password');
  const onboardingComplete = getCookie('onboarding_complete') === 'true';
  const role = getCookie('user_role') || 'normal';

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

export function setOnboardingComplete() {
  setCookie('onboarding_complete', 'true', 365);
}

export function clearAuthSession() {
  clearCookie('session_email');
  clearCookie('session_password');
  clearCookie('user_role');
  clearCookie('user_first_name');
  clearCookie('user_last_name');
}
