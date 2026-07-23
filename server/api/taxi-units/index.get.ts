import { taxiUnitService } from '../../services/taxiUnitService'

export default defineEventHandler(async (event) => {
  requireAuth(event)
  await connectDB()

  const query = getQuery(event)
  const page = Number(query.page) || 1
  const limit = Number(query.limit) || 10
  const filters = {
    status: query.status as 'Available' | 'On Trip' | 'Maintenance' | undefined,
    search: query.search as string | undefined
  }

  const result = await taxiUnitService.getAll(filters, page, limit)
  return paginatedResponse(result.data, {
    total: result.total,
    page: result.page,
    limit: result.limit,
    pages: result.pages
  })
})
