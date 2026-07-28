import { defineStore } from 'pinia'
import type { AuthUser, ApiResponse } from '~/types'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as AuthUser | null,
    loading: false,
    initialized: false
  }),

  getters: {
    isAuthenticated: (state) => !!state.user,
    isAdmin: (state) => state.user?.role === 'admin',
    isDispatcher: (state) => state.user?.role === 'dispatcher',
    isHR: (state) => state.user?.role === 'hr',
    canManageTaxis: (state) => state.user?.role === 'admin',
    canViewAuditLogs: (state) => state.user?.role === 'admin',
    canManageUsers: (state) => state.user?.role === 'admin',
    canManageDrivers: (state) => ['admin', 'hr'].includes(state.user?.role || '')
  },

  actions: {
    async login(username: string, password: string) {
      this.loading = true
      try {
        const response = await $fetch<ApiResponse<{ user: AuthUser }>>('/api/auth/login', {
          method: 'POST',
          body: { username, password }
        })
        this.user = response.data.user
        return response
      } finally {
        this.loading = false
      }
    },

    async logout() {
      try {
        await $fetch('/api/auth/logout', { method: 'POST' })
      } finally {
        this.user = null
      }
    },

    async refreshSession(headers?: HeadersInit) {
      try {
        await $fetch('/api/auth/refresh', { method: 'POST', headers })
        return true
      } catch {
        return false
      }
    },

    async fetchCurrentUser(headers?: HeadersInit) {
      try {
        const response = await $fetch<ApiResponse<{ user: AuthUser }>>('/api/auth/me', { headers })
        this.user = response.data.user
      } catch (error: any) {
        // If 401 Unauthorized, attempt a silent refresh
        if (error.response?.status === 401) {
          const refreshed = await this.refreshSession(headers)
          if (refreshed) {
            try {
              // Retry fetching user after successful refresh
              const retryResponse = await $fetch<ApiResponse<{ user: AuthUser }>>('/api/auth/me', { headers })
              this.user = retryResponse.data.user
              return
            } catch {
              this.user = null
            }
          }
        }
        this.user = null
      } finally {
        this.initialized = true
      }
    },

    setUser(user: AuthUser | null) {
      this.user = user
    }
  }
})
