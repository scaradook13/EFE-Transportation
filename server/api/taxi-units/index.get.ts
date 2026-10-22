import { taxiUnitService } from '../../services/taxiUnitService'

export default defineEventHandler(async (event) => {
  requireAuth(event)
  await connectDB()

  const query = getQuery(event)
  const archived = query.archived === 'true'
  // Only administrators can browse archived taxi units
  if (archived) requireRole(event, 'admin')

  const page = Number(query.page) || 1
  const limit = Number(query.limit) || 10
  const filters = {
    status: query.status as 'Available' | 'In Use' | 'Maintenance' | undefined,
    search: query.search as string | undefined,
    archived
  }

  const result = await taxiUnitService.getAll(filters, page, limit)
  return paginatedResponse(result.data, {
    total: result.total,
    page: result.page,
    limit: result.limit,
    pages: result.pages
  })
})
