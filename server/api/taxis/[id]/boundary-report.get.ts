import { boundaryReportService, type ReportPeriod } from '~~/server/services/boundaryReportService'

export default defineEventHandler(async (event) => {
  requireRole(event, 'admin', 'dispatcher')
  await connectDB()


  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, message: 'Taxi identifier is required' })
  }

  const query = getQuery(event)
  const period = (query.period as ReportPeriod) || 'daily'
  const date = query.date as string | undefined

  const report = await boundaryReportService.getTaxiBoundaryReport(id, period, date)

  return successResponse(report, 'Boundary report retrieved successfully')
})
