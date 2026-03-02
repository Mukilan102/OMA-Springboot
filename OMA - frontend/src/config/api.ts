/**
 * API Client Configuration
 *
 * Development: Uses VITE_API_BASE_URL from .env.development (proxied by Vite)
 * Production: Uses VITE_API_BASE_URL from .env.production (full URL to backend)
 *
 * Authentication: Uses httpOnly cookies for JWT tokens
 * Credentials are sent automatically with each request (credentials: 'include')
 * No manual token handling needed - more secure than localStorage
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

interface FetchOptions extends RequestInit {
  timeout?: number;
}

/**
 * Structured API error thrown when a response is not ok.
 * Exposes the parsed message and optional retry metadata so UI
 * components never have to display raw JSON.
 */
export class ApiError extends Error {
  status: number;
  /** Seconds the client should wait before retrying (from Retry-After header or JSON body). */
  retryAfterSeconds: number | null;

  constructor(status: number, message: string, retryAfterSeconds: number | null = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

/**
 * Parse a `Retry-After` header value into seconds.
 * Supports both delta-seconds ("60") and HTTP-date formats.
 * Returns null when the header is absent or unparseable.
 */
function parseRetryAfter(header: string | null): number | null {
  if (!header) return null;
  // Try delta-seconds first
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds > 0) return Math.ceil(seconds);
  // Try HTTP-date
  const date = Date.parse(header);
  if (!Number.isNaN(date)) {
    const delta = Math.ceil((date - Date.now()) / 1000);
    return delta > 0 ? delta : null;
  }
  return null;
}

export const apiClient = {
  baseUrl: API_BASE_URL,

  async fetch(
    endpoint: string,
    options?: FetchOptions
  ): Promise<Response> {
    const url = `${API_BASE_URL}${endpoint}`;
    const { timeout = 10000, ...fetchOptions } = options || {};

    // Ensure headers is an object for easier manipulation
    if (!fetchOptions.headers) {
      fetchOptions.headers = {};
    }

    const headers = fetchOptions.headers as Record<string, string>;

    // Add Content-Type for POST requests if not present
    if (
      fetchOptions.method?.toUpperCase() === 'POST' &&
      !headers['Content-Type']
    ) {
      headers['Content-Type'] = 'application/json';
    }

    // IMPORTANT: Always include credentials so httpOnly cookies are sent
    if (!fetchOptions.credentials) {
      fetchOptions.credentials = 'include';
    }

    fetchOptions.headers = headers;

    // Add timeout capability
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  },

  /**
   * Parse a non-ok Response into a structured ApiError.
   * Extracts human-readable message and retry metadata so callers
   * never need to display raw JSON.
   */
  async parseError(response: Response): Promise<ApiError> {
    // 1. Retry-After header (standard HTTP)
    let retryAfterSeconds = parseRetryAfter(response.headers.get('Retry-After'));

    // 2. Try to parse body as JSON
    let message = '';
    try {
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        const json = await response.json();
        message = json.message || json.error || JSON.stringify(json);
        // Support retryAfterSeconds in JSON body as fallback
        if (retryAfterSeconds == null && typeof json.retryAfterSeconds === 'number') {
          retryAfterSeconds = json.retryAfterSeconds;
        }
      } else {
        message = await response.text();
      }
    } catch {
      message = response.statusText || 'An unexpected error occurred';
    }

    if (!message) message = `Request failed (${response.status})`;

    return new ApiError(response.status, message, retryAfterSeconds);
  },
};

export default apiClient;

