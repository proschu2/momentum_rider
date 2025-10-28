// Shared HTTP client with error handling for finance API services

import type { ApiError } from './types';

export class HttpClient {
  private readonly baseUrl: string;

  constructor(baseUrl?: string) {
    // Use environment variable if available, otherwise construct from current host
    if (baseUrl) {
      this.baseUrl = baseUrl;
    } else if (import.meta.env.VITE_API_URL) {
      this.baseUrl = import.meta.env.VITE_API_URL;
    } else {
      // Construct API URL based on current window location
      const protocol = window.location.protocol;
      const host = window.location.hostname;
      const port = '3001';
      this.baseUrl = `${protocol}//${host}:${port}/api`;
    }
  }

  /**
   * Fetch data from backend API with error handling
   */
  async fetch<T>(url: string, options?: RequestInit): Promise<T> {
    try {
      const response = await fetch(url, options);
      
      if (!response.ok) {
        const error: ApiError = {
          message: `HTTP ${response.status}: ${response.statusText}`,
          status: response.status
        };
        throw error;
      }
      
      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        const apiError: ApiError = {
          message: error.message,
          code: 'NETWORK_ERROR'
        };
        throw apiError;
      }
      throw error;
    }
  }

  /**
   * GET request helper
   */
  async get<T>(endpoint: string): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    return this.fetch<T>(url);
  }

  /**
   * POST request helper
   */
  async post<T>(endpoint: string, data: any): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    return this.fetch<T>(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
  }

  /**
   * DELETE request helper
   */
  async delete(endpoint: string): Promise<void> {
    const url = `${this.baseUrl}${endpoint}`;
    await fetch(url, { method: 'DELETE' });
  }
}

// Create a default instance for convenience
export const httpClient = new HttpClient();