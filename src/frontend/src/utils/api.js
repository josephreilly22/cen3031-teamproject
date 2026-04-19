// Local development API origin
const LOCAL_API_ORIGIN = 'http://localhost:8000';

// Determine API base URL based on environment and location
export function getApiBaseUrl() {
  // Check if API URL is configured in environment variables
  const configuredBaseUrl = (process.env.REACT_APP_API_BASE_URL || '').trim();  
  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/+$/, '');
  }

  // If running in browser, use current location with localhost fallback
  if (typeof window !== 'undefined') {
    const { protocol, hostname } = window.location;
    const localHosts = new Set(['localhost', '127.0.0.1']);
    if (localHosts.has(hostname)) {
      return LOCAL_API_ORIGIN;
    }
    return `${protocol}//${hostname}`;
  }

  return LOCAL_API_ORIGIN;
}

// Build full API URL from path
export function apiUrl(path) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${getApiBaseUrl()}${normalizedPath}`;
}
