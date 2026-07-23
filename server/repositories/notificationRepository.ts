import { Notification } from '~~/server/models/Notification'

export const notificationRepository = {
  async findByUser(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit
    const [data, total, unreadCount] = await Promise.all([
      Notification.find({ user: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Notification.countDocuments({ user: userId }),
      Notification.countDocuments({ user: userId, isRead: false })
    ])

    return { data, total, unreadCount, page, limit, pages: Math.ceil(total / limit) }
  },

  async markAsRead(id: string, userId: string) {
    return Notification.findOneAndUpdate(
      { _id: id, user: userId },
      { isRead: true },
      { new: true }
    )
  },

  async markAllAsRead(userId: string) {
    return Notification.updateMany({ user: userId, isRead: false }, { isRead: true })
  },

  async create(data: { title: string; message: string; type?: string; user: string }) {
    const notification = new Notification(data)
    return notification.save()
  },

  async getUnreadCount(userId: string) {
    return Notification.countDocuments({ user: userId, isRead: false })
  }
}
