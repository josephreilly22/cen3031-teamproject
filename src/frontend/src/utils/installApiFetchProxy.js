import { getApiBaseUrl } from './api';
import { clearAuthSession } from './authSession';

const LOCAL_API_ORIGIN = 'http://localhost:8000';

export function installApiFetchProxy() {
  if (typeof window === 'undefined' || typeof window.fetch !== 'function' || window.__apiFetchProxyInstalled) {
    return;
  }

  const originalFetch = window.fetch.bind(window);

  window.fetch = (input, init) => {
    const apiBaseUrl = getApiBaseUrl();

    let fetchUrl = input;
    if (typeof input === 'string') {
      fetchUrl = input.startsWith(LOCAL_API_ORIGIN)
        ? `${apiBaseUrl}${input.slice(LOCAL_API_ORIGIN.length)}`
        : input;
    } else if (input instanceof Request && input.url.startsWith(LOCAL_API_ORIGIN)) {
      fetchUrl = `${apiBaseUrl}${input.url.slice(LOCAL_API_ORIGIN.length)}`;
    }

    const fetchRequest = typeof input === 'string' 
      ? originalFetch(fetchUrl, init)
      : input instanceof Request 
        ? originalFetch(new Request(fetchUrl, input), init)
        : originalFetch(input, init);

    return fetchRequest.then((response) => {
      const clonedResponse = response.clone();
      clonedResponse.json()
        .then((data) => {
          if (data && data.success === false && data.message === 'User not found') {
            clearAuthSession();
            window.location.href = '/login';
          }
        })
        .catch(() => {});
      return response;
    }).catch((error) => {
      throw error;
    });
  };

  window.__apiFetchProxyInstalled = true;
}
