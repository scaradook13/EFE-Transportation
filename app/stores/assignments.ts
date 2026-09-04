import { defineStore } from 'pinia'
import type { ApiResponse, PaginatedResponse } from '~/types'

export interface Assignment {
  _id: string
  assignmentNumber: string
  driver: { _id: string; fullName: string; driverId: string; photo?: string; operationalStatus: string } | string
  taxiUnit: { _id: string; taxiNumber: string; plateNumber: string; brand?: string; model?: string; color?: string; status: string } | string
  issuedBy: { _id: string; fullName: string; username: string } | string
  assignedAt: string
  returnedAt: string | null
  timeIn: string
  timeOut: string | null
  totalMinutes: number | null
  totalHours: number | null
  status: 'Active' | 'Completed'
  remarks: string
}

export const useAssignmentStore = defineStore('assignments', {
  state: () => ({
    assignments: [] as Assignment[],
    activeAssignments: [] as Assignment[],
    pagination: null as { total: number; page: number; limit: number; pages: number } | null,
    loading: false,
    actionLoading: false
  }),

  getters: {
    activeCount: (state) => state.activeAssignments.length
  },

  actions: {
    async fetchAll(params: Record<string, string | number> = {}) {
      this.loading = true
      try {
        const response = await $fetch<PaginatedResponse<Assignment[]>>('/api/assignments', { query: params })
        this.assignments = response.data
        this.pagination = response.pagination
      } finally {
        this.loading = false
      }
    },

    async fetchActive() {
      this.loading = true
      try {
        const response = await $fetch<ApiResponse<Assignment[]>>('/api/assignments/active')
        this.activeAssignments = response.data
      } finally {
        this.loading = false
      }
    },

    async issueTaxi(driverId: string, taxiUnitId: string, remarks = '', biometricToken?: string) {
      this.actionLoading = true
      try {
        const response = await $fetch<ApiResponse<Assignment>>('/api/assignments/issue', {
          method: 'POST',
          body: { driverId, taxiUnitId, remarks, biometricToken }
        })
        return response.data
      } finally {
        this.actionLoading = false
      }
    },

    async returnTaxi(assignmentId: string, remarks = '') {
      this.actionLoading = true
      try {
        const response = await $fetch<ApiResponse<unknown>>('/api/assignments/return', {
          method: 'POST',
          body: { assignmentId, remarks }
        })
        return response.data
      } finally {
        this.actionLoading = false
      }
    }
  }
})
