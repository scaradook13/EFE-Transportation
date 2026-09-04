import { defineStore } from 'pinia'
import type { Driver, CreateDriverPayload, PaginatedResponse, PaginationMeta, ApiResponse } from '~/types'

export const useDriverStore = defineStore('drivers', {
  state: () => ({
    drivers: [] as Driver[],
    activeDrivers: [] as Partial<Driver>[],
    currentDriver: null as Driver | null,
    loading: false,
    pagination: null as PaginationMeta | null,
    error: null as string | null
  }),

  actions: {
    async fetchAll(params: Record<string, string | number> = {}) {
      this.loading = true
      this.error = null
      try {
        const response = await $fetch<PaginatedResponse<Driver>>('/api/drivers', { query: params })
        this.drivers = response.data
        this.pagination = response.pagination
      } catch (err: unknown) {
        this.error = (err as { data?: { message?: string }; message?: string })?.data?.message || 'Failed to load drivers'
        throw err
      } finally {
        this.loading = false
      }
    },

    async fetchById(id: string) {
      this.loading = true
      try {
        const response = await $fetch<ApiResponse<Driver>>(`/api/drivers/${id}`)
        this.currentDriver = response.data
        return response.data
      } finally {
        this.loading = false
      }
    },

    async fetchActiveDrivers() {
      // For dispatch form dropdowns
      const response = await $fetch<PaginatedResponse<Driver>>('/api/drivers', {
        query: { employmentStatus: 'Active', limit: 100 }
      })
      this.activeDrivers = response.data
    },

    async create(payload: CreateDriverPayload & { fingerprintCredential?: any }) {
      const response = await $fetch<ApiResponse<Driver>>('/api/drivers', {
        method: 'POST',
        body: payload
      })
      this.drivers.unshift(response.data)
      return response.data
    },

    async update(id: string, payload: Partial<CreateDriverPayload>) {
      const response = await $fetch<ApiResponse<Driver>>(`/api/drivers/${id}`, {
        method: 'PUT',
        body: payload
      })
      const idx = this.drivers.findIndex(d => d._id === id)
      if (idx !== -1) this.drivers[idx] = response.data
      return response.data
    },

    async remove(id: string) {
      await $fetch(`/api/drivers/${id}`, { method: 'DELETE' })
      this.drivers = this.drivers.filter(d => d._id !== id)
    }
  }
})
