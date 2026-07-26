import { driverService } from '../../services/driverService'

export default defineEventHandler(async (event) => {
  requireAuth(event)
  await connectDB()

  const query = getQuery(event)
  const page = Number(query.page) || 1
  const limit = Number(query.limit) || 10
  const filters = {
    employmentStatus: query.employmentStatus as 'Active' | 'Inactive' | undefined,
    operationalStatus: query.operationalStatus as 'Available' | 'Active' | undefined,
    search: query.search as string | undefined
  }

  const result = await driverService.getAll(filters, page, limit)
  return paginatedResponse(result.data, {
    total: result.total,
    page: result.page,
    limit: result.limit,
    pages: result.pages
  })
})
