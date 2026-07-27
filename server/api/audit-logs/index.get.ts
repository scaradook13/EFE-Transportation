
import { auditLogRepository } from '../../repositories/auditLogRepository'

export default defineEventHandler(async (event) => {
  requireRole(event, 'admin')
  await connectDB()

  const query = getQuery(event)
  const page = Number(query.page) || 1
  const limit = Number(query.limit) || 20
  const filters = {
    user: query.user as string | undefined,
    module: query.module as string | undefined,
    dateFrom: query.dateFrom as string | undefined,
    dateTo: query.dateTo as string | undefined,
    search: query.search as string | undefined
  }

  const result = await auditLogRepository.findAll(filters, page, limit)

  return paginatedResponse(result.data, {
    total: result.total,
    page: result.page,
    limit: result.limit,
    pages: result.pages
  }, 'Audit logs retrieved')
})
