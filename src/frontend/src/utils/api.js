const LOCAL_API_ORIGIN = 'http://localhost:8000';

export function getApiBaseUrl() {
  const configuredBaseUrl = (process.env.REACT_APP_API_BASE_URL || '').trim();
  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/+$/, '');
  }

  if (typeof window !== 'undefined') {
    const { protocol, hostname } = window.location;
    const localHosts = new Set(['localhost', '127.0.0.1']);
    if (localHosts.has(hostname)) {
      return LOCAL_API_ORIGIN;
    }
    return `${protocol}//${hostname}:8000`;
  }

  return LOCAL_API_ORIGIN;
}

export function apiUrl(path) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${getApiBaseUrl()}${normalizedPath}`;
}
