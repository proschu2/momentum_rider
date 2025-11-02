// Enhanced HTTP client with authentication support

import type { ApiError } from './types'
import { useAuthStore } from '@/stores/auth'

export class ApiClient {
  private readonly baseUrl: string

  constructor(baseUrl?: string) {
    // Use environment variable if available, otherwise construct from current host
    if (baseUrl) {
      this.baseUrl = baseUrl
    } else if (import.meta.env.VITE_API_URL) {
      this.baseUrl = import.meta.env.VITE_API_URL
    } else {
      // Construct API URL based on current window location
      const protocol = window.location.protocol
      const host = window.location.hostname
      const port = '3001'
      this.baseUrl = `${protocol}//${host}:${port}/api`
    }
  }

  /**
   * Get auth headers including Bearer token
   */
  private getAuthHeaders(): Record<string, string> {
    const authStore = useAuthStore()
    const token = authStore.getToken()

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    return headers
  }

  /**
   * Fetch data from backend API with error handling and auth
   */
  async fetch<T>(url: string, options?: RequestInit): Promise<T> {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.getAuthHeaders(),
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
   * GET request helper with auth
   */
  async get<T>(endpoint: string): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    return this.fetch<T>(url)
  }

  /**
   * POST request helper with auth
   */
  async post<T>(endpoint: string, data: any): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    return this.fetch<T>(url, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    })
  }

  /**
   * PUT request helper with auth
   */
  async put<T>(endpoint: string, data: any): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    return this.fetch<T>(url, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    })
  }

  /**
   * DELETE request helper with auth
   */
  async delete<T>(endpoint: string): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    return this.fetch<T>(url, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    })
  }
}

// Create a default instance for convenience
export const apiClient = new ApiClient()
