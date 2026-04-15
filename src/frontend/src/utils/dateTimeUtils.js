/**
 * Utility functions for handling UTC datetime conversions between backend and frontend
 */

/**
 * Parse a UTC datetime string from the backend and return a Date object
 * The backend always returns dates in ISO format with 'Z' indicating UTC
 * @param {string} dateStr - ISO datetime string (e.g., "2024-04-14T20:00:00Z")
 * @returns {Date|null} - Parsed Date object in UTC, or null if invalid
 */
export function parseBackendDateTime(dateStr) {
  if (!dateStr) return null;
  try {
    return new Date(dateStr);
  } catch {
    return null;
  }
}

/**
 * Format a UTC datetime for display in the user's local timezone
 * @param {string} dateStr - ISO datetime string from backend
 * @param {Object} options - Formatting options for toLocaleString
 * @returns {string} - Formatted datetime string in local timezone
 */
export function formatDateTimeToLocal(dateStr, options = {}) {
  if (!dateStr) return '';
  
  const parsed = parseBackendDateTime(dateStr);
  if (!parsed || Number.isNaN(parsed.getTime())) return dateStr;
  
  const defaultOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  };
  
  return parsed.toLocaleString('en-US', { ...defaultOptions, ...options });
}

/**
 * Format a UTC datetime for display (date only, no time)
 * @param {string} dateStr - ISO datetime string from backend
 * @returns {string} - Formatted date string in local timezone
 */
export function formatDateOnly(dateStr) {
  if (!dateStr) return '';
  
  const parsed = parseBackendDateTime(dateStr);
  if (!parsed || Number.isNaN(parsed.getTime())) {
    // Try parsing as date-only string
    const dateOnly = parseBackendDateTime(`${dateStr}T00:00:00Z`);
    if (dateOnly && !Number.isNaN(dateOnly.getTime())) {
      return dateOnly.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
    return dateStr;
  }
  
  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Check if an event is currently live (between start and end time)
 * @param {string} startDateStr - UTC datetime string from backend
 * @param {string} endDateStr - UTC datetime string from backend (optional)
 * @returns {boolean} - True if event is currently happening
 */
export function isEventLiveNow(startDateStr, endDateStr) {
  const now = new Date();
  const startTime = startDateStr ? parseBackendDateTime(startDateStr) : null;
  const endTime = endDateStr ? parseBackendDateTime(endDateStr) : null;
  
  const startValid = startTime && !Number.isNaN(startTime.getTime());
  const endValid = endTime && !Number.isNaN(endTime.getTime());
  
  if (!startValid) return false;
  
  const isAfterStart = startTime <= now;
  const isBeforeEnd = !endValid || endTime >= now;
  
  return isAfterStart && isBeforeEnd;
}

/**
 * Check if an event has expired (end time is in the past)
 * @param {string} endDateStr - UTC datetime string from backend
 * @returns {boolean} - True if event has ended
 */
export function isEventExpired(endDateStr) {
  if (!endDateStr) return false;
  
  const endTime = parseBackendDateTime(endDateStr);
  if (!endTime || Number.isNaN(endTime.getTime())) return false;
  
  return endTime < new Date();
}

/**
 * Get time remaining until event starts or until it ends
 * @param {string} startDateStr - UTC datetime string from backend
 * @param {string} endDateStr - UTC datetime string from backend (optional)
 * @returns {Object|null} - { type: 'starts-in' | 'ends-in' | 'expired', milliseconds: number } or null
 */
export function getEventTimeStatus(startDateStr, endDateStr) {
  const now = new Date();
  const startTime = startDateStr ? parseBackendDateTime(startDateStr) : null;
  const endTime = endDateStr ? parseBackendDateTime(endDateStr) : null;
  
  if (!startTime || Number.isNaN(startTime.getTime())) return null;
  
  if (startTime > now) {
    return {
      type: 'starts-in',
      milliseconds: startTime.getTime() - now.getTime(),
    };
  }
  
  if (endTime && !Number.isNaN(endTime.getTime())) {
    if (endTime > now) {
      return {
        type: 'ends-in',
        milliseconds: endTime.getTime() - now.getTime(),
      };
    }
    return {
      type: 'expired',
      milliseconds: 0,
    };
  }
  
  return null;
}
