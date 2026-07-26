import { assignmentRepository } from '../../../repositories/assignmentRepository'

export default defineEventHandler(async (event) => {
  requireAuth(event)
  await connectDB()

  const driverId = getRouterParam(event, 'driverId')
  if (!driverId) {
    throw createError({ statusCode: 400, message: 'Driver ID is required' })
  }

  const query = getQuery(event)
  const page = Number(query.page) || 1
  const limit = Number(query.limit) || 20

  const result = await assignmentRepository.findByDriver(driverId, page, limit)

  return paginatedResponse(result.data, {
    total: result.total,
    page: result.page,
    limit: result.limit,
    pages: result.pages
  }, 'Driver assignment history retrieved')
})
