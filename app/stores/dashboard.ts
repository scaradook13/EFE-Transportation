import { defineStore } from 'pinia'
import type { DashboardData, ApiResponse } from '~/types'

export const useDashboardStore = defineStore('dashboard', {
  state: () => ({
    data: null as DashboardData | null,
    loading: false,
    error: null as string | null,
    lastFetched: null as Date | null
  }),

  actions: {
    async fetchStats() {
      this.loading = true
      this.error = null
      try {
        const response = await $fetch<ApiResponse<DashboardData>>('/api/dashboard')
        this.data = response.data
        this.lastFetched = new Date()
      } catch (err: unknown) {
        this.error = (err as { message?: string })?.message || 'Failed to load dashboard data'
        throw err
      } finally {
        this.loading = false
      }
    }
  }
})
