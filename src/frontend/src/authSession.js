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

export function getAuthSession() {
  const email = getCookie('session_email');
  const password = getCookie('session_password');

  return {
    email,
    password,
    signedIn: Boolean(email && password),
  };
}

export function clearAuthSession() {
  clearCookie('session_email');
  clearCookie('session_password');
}
