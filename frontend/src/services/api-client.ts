// HTTP client for backend API integration

import type { ApiError } from './types'

export class ApiClient {
  private readonly baseUrl: string

  constructor(baseUrl?: string) {
    // Use environment variable if available, otherwise use relative path
    if (baseUrl) {
      this.baseUrl = baseUrl
    } else if (import.meta.env.VITE_API_URL) {
      this.baseUrl = import.meta.env.VITE_API_URL
    } else {
      // For consolidated deployment, use relative path
      this.baseUrl = '/api'
    }
  }

  /**
   * Get standard headers for API requests
   */
  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
    }
  }

  /**
   * Fetch data from backend API with error handling
   */
  async fetch<T>(url: string, options?: RequestInit): Promise<T> {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.getHeaders(),
          ...options?.headers,
        },
      })

      if (!response.ok) {
        const error: ApiError = {
          message: `HTTP ${response.status}: ${response.statusText}`,
          status: response.status
        }
        throw error
      }

      return await response.json()
    } catch (error) {
      if (error instanceof Error) {
        const apiError: ApiError = {
          message: error.message,
          code: 'NETWORK_ERROR'
        }
        throw apiError
      }
      throw error
    }
  }

  /**
   * GET request helper
   */
  async get<T>(endpoint: string): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    return this.fetch<T>(url)
  }

  /**
   * POST request helper
   */
  async post<T>(endpoint: string, data: any): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    return this.fetch<T>(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    })
  }

  /**
   * PUT request helper
   */
  async put<T>(endpoint: string, data: any): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    return this.fetch<T>(url, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    })
  }

  /**
   * DELETE request helper
   */
  async delete<T>(endpoint: string): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    return this.fetch<T>(url, {
      method: 'DELETE',
      headers: this.getHeaders(),
    })
  }
}

// Create a default instance for convenience
export const apiClient = new ApiClient()
