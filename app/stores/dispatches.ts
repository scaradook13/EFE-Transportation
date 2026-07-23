import { defineStore } from 'pinia'
import type { Dispatch, CreateDispatchPayload, UpdateDispatchPayload, PaginatedResponse, PaginationMeta, ApiResponse } from '~/types'

export const useDispatchStore = defineStore('dispatches', {
  state: () => ({
    dispatches: [] as Dispatch[],
    currentDispatch: null as Dispatch | null,
    loading: false,
    pagination: null as PaginationMeta | null,
    error: null as string | null
  }),

  getters: {
    activeDispatches: (state) => state.dispatches.filter(d => d.status === 'Active'),
    completedDispatches: (state) => state.dispatches.filter(d => d.status === 'Completed'),
    cancelledDispatches: (state) => state.dispatches.filter(d => d.status === 'Cancelled')
  },

  actions: {
    async fetchAll(params: Record<string, string | number> = {}) {
      this.loading = true
      this.error = null
      try {
        const response = await $fetch<PaginatedResponse<Dispatch>>('/api/dispatches', { query: params })
        this.dispatches = response.data
        this.pagination = response.pagination
      } catch (err: unknown) {
        this.error = (err as { data?: { message?: string }; message?: string })?.data?.message || 'Failed to load dispatches'
        throw err
      } finally {
        this.loading = false
      }
    },

    async create(payload: CreateDispatchPayload) {
      const response = await $fetch<ApiResponse<Dispatch>>('/api/dispatches', {
        method: 'POST',
        body: payload
      })
      this.dispatches.unshift(response.data)
      return response.data
    },

    async update(id: string, payload: UpdateDispatchPayload) {
      const response = await $fetch<ApiResponse<Dispatch>>(`/api/dispatches/${id}`, {
        method: 'PUT',
        body: payload
      })
      const idx = this.dispatches.findIndex(d => d._id === id)
      if (idx !== -1) this.dispatches[idx] = response.data!
      return response.data
    },

    async complete(id: string, remarks?: string) {
      return this.update(id, { status: 'Completed', remarks })
    },

    async cancel(id: string, remarks?: string) {
      return this.update(id, { status: 'Cancelled', remarks })
    }
  }
})
