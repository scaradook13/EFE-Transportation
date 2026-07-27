import { assignmentRepository } from '../../../../repositories/assignmentRepository'

export default defineEventHandler(async (event) => {
  requireRole(event, 'admin', 'dispatcher')
  await connectDB()

  const taxiId = getRouterParam(event, 'taxiId')
  if (!taxiId) {
    throw createError({ statusCode: 400, message: 'Taxi ID is required' })
  }

  const query = getQuery(event)
  const page = Number(query.page) || 1
  const limit = Number(query.limit) || 20

  const result = await assignmentRepository.findByTaxi(taxiId, page, limit)

  return paginatedResponse(result.data, {
    total: result.total,
    page: result.page,
    limit: result.limit,
    pages: result.pages
  }, 'Taxi assignment history retrieved')
})
