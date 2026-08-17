import axios from 'axios';
import loggingService from './loggingService';

/**
 * API Client Setup
 * Configure axios with interceptors for error handling, logging, and token management
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '/v1';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  withCredentials: true, // Enable CORS credentials for production
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request Interceptor
 * Add auth token and log requests
 */
apiClient.interceptors.request.use(
  (config) => {
    // Add auth token to headers
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Log request
    loggingService.debug(`API Request: ${config.method.toUpperCase()} ${config.url}`);

    // Mark start time for duration tracking
    config.metadata = { startTime: Date.now() };

    return config;
  },
  (error) => {
    loggingService.error('Request setup failed', error);
    return Promise.reject(error);
  }
);

/**
 * Response Interceptor
 * Handle responses, errors, token refresh, and logging
 */
apiClient.interceptors.response.use(
  (response) => {
    // Calculate request duration
    const duration = Date.now() - response.config.metadata.startTime;

    // Log response
    loggingService.logAPICall(
      response.config.method.toUpperCase(),
      response.config.url,
      response.status,
      duration
    );

    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Log error
    const duration = Date.now() - originalRequest.metadata.startTime;
    loggingService.error(
      `API Error: ${originalRequest.method.toUpperCase()} ${originalRequest.url}`,
      error,
      { status: error.response?.status, duration }
    );

    // Handle 401 Unauthorized - Try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        loggingService.info('Attempting to refresh token...');

        const token = localStorage.getItem('auth_token');
        const refreshResponse = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {},
          {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          }
        );

        const newToken = refreshResponse.data.data.token;
        localStorage.setItem('auth_token', newToken);

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        loggingService.error('Token refresh failed', refreshError);

        // Clear auth and redirect to login
        localStorage.removeItem('auth_token');
        window.location.href = '/';

        return Promise.reject(refreshError);
      }
    }

    // Handle 403 Forbidden - No permission
    if (error.response?.status === 403) {
      loggingService.warn('Access forbidden', { url: originalRequest.url });
    }

    // Handle 404 Not Found
    if (error.response?.status === 404) {
      loggingService.warn('Resource not found', { url: originalRequest.url });
    }

    // Handle 429 Too Many Requests - Rate limited
    if (error.response?.status === 429) {
      loggingService.warn('Rate limited, backing off...');

      // Implement exponential backoff
      const retryAfter = parseInt(error.response.headers['retry-after'] || '60');
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));

      return apiClient(originalRequest);
    }

    // Handle 5xx Server Errors
    if (error.response?.status >= 500) {
      loggingService.fatal('Server error', error, {
        status: error.response.status,
        url: originalRequest.url,
      });
    }

    // Handle network errors
    if (!error.response) {
      loggingService.error('Network error', error);
    }

    return Promise.reject(error);
  }
);

/**
 * Utility methods
 */
export const api = {
  /**
   * GET request
   */
  get: (url, config = {}) => {
    return apiClient.get(url, config);
  },

  /**
   * POST request
   */
  post: (url, data = {}, config = {}) => {
    return apiClient.post(url, data, config);
  },

  /**
   * PUT request
   */
  put: (url, data = {}, config = {}) => {
    return apiClient.put(url, data, config);
  },

  /**
   * PATCH request
   */
  patch: (url, data = {}, config = {}) => {
    return apiClient.patch(url, data, config);
  },

  /**
   * DELETE request
   */
  delete: (url, config = {}) => {
    return apiClient.delete(url, config);
  },

  /**
   * GET with retry logic
   */
  getWithRetry: async (url, maxRetries = 3, config = {}) => {
    let lastError;

    for (let i = 0; i < maxRetries; i++) {
      try {
        return await apiClient.get(url, config);
      } catch (error) {
        lastError = error;

        // Don't retry on 4xx errors
        if (error.response?.status >= 400 && error.response?.status < 500) {
          throw error;
        }

        // Wait before retrying
        if (i < maxRetries - 1) {
          const delay = Math.pow(2, i) * 1000; // Exponential backoff
          loggingService.info(`Retrying ${url} after ${delay}ms (attempt ${i + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  },

  /**
   * POST with retry logic
   */
  postWithRetry: async (url, data = {}, maxRetries = 3, config = {}) => {
    let lastError;

    for (let i = 0; i < maxRetries; i++) {
      try {
        return await apiClient.post(url, data, config);
      } catch (error) {
        lastError = error;

        // Don't retry on 4xx errors
        if (error.response?.status >= 400 && error.response?.status < 500) {
          throw error;
        }

        // Wait before retrying
        if (i < maxRetries - 1) {
          const delay = Math.pow(2, i) * 1000;
          loggingService.info(`Retrying POST ${url} after ${delay}ms (attempt ${i + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  },
};

export default apiClient;
