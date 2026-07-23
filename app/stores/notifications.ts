import { defineStore } from 'pinia'
import type { Notification, PaginatedResponse, PaginationMeta } from '~/types'

export const useNotificationStore = defineStore('notifications', {
  state: () => ({
    notifications: [] as Notification[],
    unreadCount: 0,
    loading: false,
    pagination: null as PaginationMeta | null
  }),

  actions: {
    async fetchAll(params: Record<string, string | number> = {}) {
      this.loading = true
      try {
        const response = await $fetch<PaginatedResponse<Notification>>('/api/notifications', { query: params })
        this.notifications = response.data
        this.pagination = response.pagination
        this.unreadCount = response.data.filter(n => !n.isRead).length
      } finally {
        this.loading = false
      }
    },

    async markAsRead(id: string) {
      await $fetch(`/api/notifications/${id}/read`, { method: 'PUT' })
      const notification = this.notifications.find(n => n._id === id)
      if (notification && !notification.isRead) {
        notification.isRead = true
        this.unreadCount = Math.max(0, this.unreadCount - 1)
      }
    },

    async markAllAsRead() {
      await $fetch('/api/notifications/mark-all-read', { method: 'PUT' })
      this.notifications.forEach(n => { n.isRead = true })
      this.unreadCount = 0
    }
  }
})
