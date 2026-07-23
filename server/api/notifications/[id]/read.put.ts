import { notificationService } from '~~/server/services/notificationService'

export default defineEventHandler(async (event) => {
  const authUser = requireAuth(event)
  await connectDB()
  const id = getRouterParam(event, 'id')!

  const notification = await notificationService.markAsRead(id, authUser.userId)

  return successResponse(notification, 'Notification marked as read')
})
