import { defineStore } from 'pinia'
import type { TaxiUnit, CreateTaxiUnitPayload, PaginatedResponse, PaginationMeta, ApiResponse } from '~/types'

export const useTaxiUnitStore = defineStore('taxiUnits', {
  state: () => ({
    taxiUnits: [] as TaxiUnit[],
    availableUnits: [] as Partial<TaxiUnit>[],
    loading: false,
    pagination: null as PaginationMeta | null,
    error: null as string | null
  }),

  actions: {
    async fetchAll(params: Record<string, string | number> = {}) {
      this.loading = true
      this.error = null
      try {
        const response = await $fetch<PaginatedResponse<TaxiUnit>>('/api/taxi-units', { query: params })
        this.taxiUnits = response.data
        this.pagination = response.pagination
      } catch (err: unknown) {
        this.error = (err as { data?: { message?: string }; message?: string })?.data?.message || 'Failed to load taxi units'
        throw err
      } finally {
        this.loading = false
      }
    },

    async fetchAvailableUnits() {
      const response = await $fetch<PaginatedResponse<TaxiUnit>>('/api/taxi-units', {
        query: { status: 'Available', limit: 100 }
      })
      this.availableUnits = response.data
    },

    async create(payload: CreateTaxiUnitPayload) {
      const response = await $fetch<ApiResponse<TaxiUnit>>('/api/taxi-units', {
        method: 'POST',
        body: payload
      })
      this.taxiUnits.unshift(response.data)
      return response.data
    },

    async update(id: string, payload: Partial<CreateTaxiUnitPayload>) {
      const response = await $fetch<ApiResponse<TaxiUnit>>(`/api/taxi-units/${id}`, {
        method: 'PUT',
        body: payload
      })
      const idx = this.taxiUnits.findIndex(t => t._id === id)
      if (idx !== -1) this.taxiUnits[idx] = response.data
      return response.data
    },

    async remove(id: string) {
      await $fetch(`/api/taxi-units/${id}`, { method: 'DELETE' })
      this.taxiUnits = this.taxiUnits.filter(t => t._id !== id)
    }
  }
})
