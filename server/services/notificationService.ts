import { notificationRepository } from '~~/server/repositories/notificationRepository'

export const notificationService = {
  async getByUser(userId: string, page: number, limit: number) {
    await connectDB()
    return notificationRepository.findByUser(userId, page, limit)
  },

  async markAsRead(id: string, userId: string) {
    await connectDB()
    const notification = await notificationRepository.markAsRead(id, userId)
    if (!notification) {
      throw createError({ statusCode: 404, message: 'Notification not found' })
    }
    return notification
  },

  async markAllAsRead(userId: string) {
    await connectDB()
    return notificationRepository.markAllAsRead(userId)
  },

  async create(data: { title: string; message: string; type?: string; user: string }) {
    await connectDB()
    return notificationRepository.create(data)
  },

  async getUnreadCount(userId: string) {
    await connectDB()
    return notificationRepository.getUnreadCount(userId)
  }
}
