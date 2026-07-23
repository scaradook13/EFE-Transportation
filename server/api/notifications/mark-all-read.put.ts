import { notificationService } from '~~/server/services/notificationService'

export default defineEventHandler(async (event) => {
  const authUser = requireAuth(event)
  await connectDB()
  await notificationService.markAllAsRead(authUser.userId)
  return successResponse(null, 'All notifications marked as read')
})
