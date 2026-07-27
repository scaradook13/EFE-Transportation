import { assignmentRepository } from '../../repositories/assignmentRepository'

export default defineEventHandler(async (event) => {
  requireRole(event, 'admin', 'dispatcher', 'hr')
  await connectDB()

  const query = getQuery(event)
  const page = Number(query.page) || 1
  const limit = Number(query.limit) || 20
  const filters = {
    status: query.status as 'Active' | 'Completed' | undefined,
    driver: query.driver as string | undefined,
    taxiUnit: query.taxiUnit as string | undefined,
    dateFrom: query.dateFrom as string | undefined,
    dateTo: query.dateTo as string | undefined,
    search: query.search as string | undefined
  }

  const result = await assignmentRepository.findAll(filters, page, limit)

  return paginatedResponse(result.data, {
    total: result.total,
    page: result.page,
    limit: result.limit,
    pages: result.pages
  }, 'Assignments retrieved')
})
