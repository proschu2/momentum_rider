// Enhanced HTTP client with error handling, connection testing, and retry logic

import type { ApiError } from './types';

// Configuration interface
interface HttpClientConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  testConnection: boolean;
}

// Connection test result
interface ConnectionTestResult {
  isConnected: boolean;
  latency?: number;
  error?: string;
}

// Default configuration
const DEFAULT_CONFIG: Omit<HttpClientConfig, 'baseUrl'> = {
  timeout: 10000, // 10 seconds
  retryAttempts: 3,
  retryDelay: 1000, // 1 second
  testConnection: true,
};

// Parse environment variable for base URL
function parseBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_URL;

  if (envUrl) {
    // If it's a full URL, use it as-is
    if (envUrl.startsWith('http://') || envUrl.startsWith('https://')) {
      return envUrl.replace(/\/$/, ''); // Remove trailing slash
    }

    // If it's just host:port, construct the full URL
    if (envUrl.includes(':')) {
      const [host, port] = envUrl.split(':');
      const protocol = window.location.protocol;
      return `${protocol}//${host}:${port}`;
    }
  }

  // For consolidated deployment, use relative path
  return '/api';
}

// Get configuration from environment variables
function getConfig(): HttpClientConfig {
  return {
    baseUrl: parseBaseUrl(),
    timeout: parseInt(import.meta.env.VITE_API_TIMEOUT || '10000', 10),
    retryAttempts: parseInt(import.meta.env.VITE_API_RETRY_ATTEMPTS || '3', 10),
    retryDelay: parseInt(import.meta.env.VITE_API_RETRY_DELAY || '1000', 10),
    testConnection: (import.meta.env.VITE_API_TEST_CONNECTION || 'true') === 'true',
  };
}

// Check if the app is offline
function isOffline(): boolean {
  return !navigator.onLine;
}

// Enhanced error class for API errors
export class HttpClientError extends Error {
  code: string;
  status?: number;
  originalError?: Error;

  constructor(message: string, code: string, status?: number, originalError?: Error) {
    super(message);
    this.name = 'HttpClientError';
    this.code = code;
    this.status = status;
    this.originalError = originalError;

    // Maintains proper stack trace for where our error was thrown
    // Note: Error.captureStackTrace is Node.js specific, not available in browsers
    // The stack trace is automatically captured in browser environments
  }
}

export class HttpClient {
  private config: HttpClientConfig;
  private isConnected: boolean = false;
  private lastConnectionTest: number = 0;
  private readonly CONNECTION_TEST_CACHE_MS = 30000; // Cache test results for 30 seconds

  constructor(customConfig?: Partial<HttpClientConfig>) {
    this.config = {
      ...getConfig(),
      ...customConfig,
    };
  }

  /**
   * Test connection to the backend
   */
  async testConnection(): Promise<ConnectionTestResult> {
    const now = Date.now();

    // Use cached result if available and recent
    if (this.lastConnectionTest > 0 && (now - this.lastConnectionTest) < this.CONNECTION_TEST_CACHE_MS) {
      return {
        isConnected: this.isConnected,
        latency: 0, // Cached, no real latency measurement
      };
    }

    try {
      const startTime = performance.now();
      const healthUrl = `${this.config.baseUrl}/health`;
      const response = await this.fetchWithTimeout(healthUrl, { method: 'GET' }, this.config.timeout);
      const latency = performance.now() - startTime;

      this.isConnected = response.ok;
      this.lastConnectionTest = now;

      return {
        isConnected: true,
        latency,
      };
    } catch (error) {
      this.isConnected = false;
      this.lastConnectionTest = now;

      return {
        isConnected: false,
        error: error instanceof Error ? error.message : 'Connection test failed',
      };
    }
  }

  /**
   * Check if backend is currently reachable
   */
  getConnectionStatus(): boolean {
    const now = Date.now();
    // If last test is too old, assume disconnected
    if (this.lastConnectionTest === 0 || (now - this.lastConnectionTest) > this.CONNECTION_TEST_CACHE_MS) {
      return false;
    }
    return this.isConnected;
  }

  /**
   * Get the configured base URL
   */
  getBaseUrl(): string {
    return this.config.baseUrl;
  }

  /**
   * Fetch with timeout
   */
  private async fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs: number): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Execute with exponential backoff retry
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxAttempts: number = this.config.retryAttempts,
    initialDelay: number = this.config.retryDelay
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        // Don't retry on certain errors
        if (error instanceof HttpClientError) {
          if (error.status === 401 || error.status === 403) {
            throw error; // Don't retry auth errors
          }
          if (error.status && error.status >= 400 && error.status < 500) {
            // Don't retry client errors (4xx)
            throw error;
          }
        }

        // Last attempt, throw the error
        if (attempt === maxAttempts) {
          throw error;
        }

        // Calculate delay with exponential backoff and jitter
        const delay = initialDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
        console.warn(
          `[HttpClient] Attempt ${attempt}/${maxAttempts} failed, retrying in ${Math.round(delay)}ms...`
        );
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  /**
   * Fetch data from backend API with enhanced error handling
   */
  async fetch<T>(url: string, options: RequestInit = {}): Promise<T> {
    // Check offline status first
    if (isOffline()) {
      throw new HttpClientError(
        'No internet connection. Please check your network and try again.',
        'OFFLINE'
      );
    }

    // Handle URL construction for consolidated deployment
    let processedUrl = url;
    
    // If baseUrl already contains /api, don't add it again
    if (this.config.baseUrl.includes('/api') && url.startsWith('/api')) {
      // Remove the duplicate /api prefix
      processedUrl = url.substring(4); // Remove '/api' from the beginning
    } else if (!url.startsWith('http') && !url.startsWith('/api')) {
      processedUrl = `/api${url}`;
    }
    
    const fullUrl = processedUrl.startsWith('http') ? processedUrl : `${this.config.baseUrl}${processedUrl}`;

    return this.executeWithRetry(async () => {
      try {
        console.debug(`[HttpClient] Making request to: ${fullUrl}`);
        const response = await this.fetchWithTimeout(fullUrl, options, this.config.timeout);
        console.debug(`[HttpClient] Response status: ${response.status} ${response.statusText} for ${fullUrl}`);
        
        if (!response.ok) {
          console.warn(`[HttpClient] Request failed: ${response.status} ${response.statusText}`);
        }

        if (!response.ok) {
          let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

          try {
            const errorData = await response.json();
            if (errorData.message) {
              errorMessage = errorData.message;
            } else if (errorData.error) {
              errorMessage = errorData.error;
            }
          } catch {
            // If we can't parse error response, use default message
          }

          throw new HttpClientError(errorMessage, 'HTTP_ERROR', response.status);
        }

        // Handle empty responses
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          return await response.json();
        }

        // For non-JSON responses, return as text
        const text = await response.text();
        return text as unknown as T;
      } catch (error) {
        if (error instanceof HttpClientError) {
          throw error;
        }

        if (error instanceof Error) {
          // Handle specific error types
          if (error.name === 'AbortError') {
            throw new HttpClientError(
              `Request timeout after ${this.config.timeout}ms. The server may be slow or unreachable.`,
              'TIMEOUT'
            );
          }

          if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            throw new HttpClientError(
              'Cannot connect to the server. Please check your internet connection and try again.',
              'NETWORK_ERROR'
            );
          }

          throw new HttpClientError(
            error.message,
            'UNKNOWN_ERROR',
            undefined,
            error
          );
        }

        throw new HttpClientError('An unknown error occurred', 'UNKNOWN_ERROR');
      }
    });
  }

  /**
   * GET request helper
   */
  async get<T>(endpoint: string): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `${this.config.baseUrl}${endpoint}`;
    return this.fetch<T>(url, { method: 'GET' });
  }

  /**
   * POST request helper
   */
  async post<T>(endpoint: string, data: any): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `${this.config.baseUrl}${endpoint}`;
    return this.fetch<T>(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
  }

  /**
   * PUT request helper
   */
  async put<T>(endpoint: string, data: any): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `${this.config.baseUrl}${endpoint}`;
    return this.fetch<T>(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
  }

  /**
   * DELETE request helper
   */
  async delete<T>(endpoint: string): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `${this.config.baseUrl}${endpoint}`;
    return this.fetch<T>(url, { method: 'DELETE' });
  }

  /**
   * PATCH request helper
   */
  async patch<T>(endpoint: string, data: any): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `${this.config.baseUrl}${endpoint}`;
    return this.fetch<T>(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
  }
}

// Create a default instance for convenience
export const httpClient = new HttpClient();

// Helper functions for external use
export const connectionUtils = {
  /**
   * Check if the user is online
   */
  isOnline(): boolean {
    return navigator.onLine;
  },

  /**
   * Add online/offline event listeners
   */
  addConnectionListeners(onOnline: () => void, onOffline: () => void): () => void {
    const handleOnline = () => onOnline();
    const handleOffline = () => onOffline();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Return cleanup function
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  },
};
