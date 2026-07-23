import { notificationService } from '../../services/notificationService'

export default defineEventHandler(async (event) => {
  const authUser = requireAuth(event)
  await connectDB()

  const query = getQuery(event)
  const page = Number(query.page) || 1
  const limit = Number(query.limit) || 20

  const result = await notificationService.getByUser(authUser.userId, page, limit)

  return paginatedResponse(result.data, {
    total: result.total,
    page: result.page,
    limit: result.limit,
    pages: result.pages
  }, 'Notifications retrieved')
})
