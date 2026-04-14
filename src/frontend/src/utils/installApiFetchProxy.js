import { getApiBaseUrl } from './api';

const LOCAL_API_ORIGIN = 'http://localhost:8000';

export function installApiFetchProxy() {
  if (typeof window === 'undefined' || typeof window.fetch !== 'function' || window.__apiFetchProxyInstalled) {
    return;
  }

  const originalFetch = window.fetch.bind(window);

  window.fetch = (input, init) => {
    const apiBaseUrl = getApiBaseUrl();

    if (typeof input === 'string') {
      const nextInput = input.startsWith(LOCAL_API_ORIGIN)
        ? `${apiBaseUrl}${input.slice(LOCAL_API_ORIGIN.length)}`
        : input;
      return originalFetch(nextInput, init);
    }

    if (input instanceof Request && input.url.startsWith(LOCAL_API_ORIGIN)) {
      const nextUrl = `${apiBaseUrl}${input.url.slice(LOCAL_API_ORIGIN.length)}`;
      const nextRequest = new Request(nextUrl, input);
      return originalFetch(nextRequest, init);
    }

    return originalFetch(input, init);
  };

  window.__apiFetchProxyInstalled = true;
}
