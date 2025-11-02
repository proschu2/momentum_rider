import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface User {
  id: string
  email: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterCredentials extends LoginCredentials {
  confirmPassword: string
}

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref<User | null>(null)
  const token = ref<string | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Getters
  const isAuthenticated = computed(() => !!token.value && !!user.value)
  const userEmail = computed(() => user.value?.email || '')

  // Actions

  /**
   * Login user with email and password
   */
  async function login(credentials: LoginCredentials) {
    try {
      isLoading.value = true
      error.value = null

      // Construct API URL using same pattern as other services
      const API_BASE_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:3001/api`

      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error?.message || 'Login failed')
      }

      // Store token and user data
      token.value = data.token
      user.value = data.user

      // Persist to localStorage
      localStorage.setItem('auth_token', token.value)
      localStorage.setItem('user', JSON.stringify(user.value))

      return true
    } catch (err) {
      error.value = (err as Error).message
      console.error('Login error:', err)
      return false
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Register new user
   */
  async function register(credentials: RegisterCredentials) {
    try {
      isLoading.value = true
      error.value = null

      // Construct API URL using same pattern as other services
      const API_BASE_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:3001/api`

      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: credentials.email,
          password: credentials.password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error?.message || 'Registration failed')
      }

      // Store token and user data
      token.value = data.token
      user.value = data.user

      // Persist to localStorage
      localStorage.setItem('auth_token', token.value)
      localStorage.setItem('user', JSON.stringify(user.value))

      return true
    } catch (err) {
      error.value = (err as Error).message
      console.error('Registration error:', err)
      return false
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Logout user
   */
  function logout() {
    user.value = null
    token.value = null
    error.value = null

    // Clear localStorage
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user')
  }

  /**
   * Initialize auth state from localStorage
   */
  function initializeAuth() {
    try {
      const storedToken = localStorage.getItem('auth_token')
      const storedUser = localStorage.getItem('user')

      if (storedToken && storedUser) {
        token.value = storedToken
        user.value = JSON.parse(storedUser)
      }
    } catch (err) {
      console.error('Failed to initialize auth from localStorage:', err)
      logout()
    }
  }

  /**
   * Get auth token for API requests
   */
  function getToken(): string | null {
    return token.value
  }

  return {
    // State
    user,
    token,
    isLoading,
    error,
    // Getters
    isAuthenticated,
    userEmail,
    // Actions
    login,
    register,
    logout,
    initializeAuth,
    getToken,
  }
})
