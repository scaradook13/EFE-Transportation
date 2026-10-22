import { driverService } from '../../services/driverService'

export default defineEventHandler(async (event) => {
  requireAuth(event)
  await connectDB()

  const query = getQuery(event)
  const archived = query.archived === 'true'
  // Only administrators can browse archived drivers
  if (archived) requireRole(event, 'admin')

  const page = Number(query.page) || 1
  const limit = Number(query.limit) || 10
  const filters = {
    employmentStatus: query.employmentStatus as 'Active' | 'Inactive' | undefined,
    operationalStatus: query.operationalStatus as 'Available' | 'Active' | undefined,
    search: query.search as string | undefined,
    archived
  }

  const result = await driverService.getAll(filters, page, limit)
  return paginatedResponse(result.data, {
    total: result.total,
    page: result.page,
    limit: result.limit,
    pages: result.pages
  })
})
