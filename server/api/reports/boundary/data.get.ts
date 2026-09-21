import { boundaryReportService } from '../../../services/boundaryReportService'
import type { ReportPeriod } from '../../../../app/types'

export default defineEventHandler(async (event) => {
  requireRole(event, 'admin', 'dispatcher')
  await connectDB()

  const query = getQuery(event)
  const reportType = (query.type as string) === 'fleet' ? 'fleet' : 'taxi'
  const period = (query.period as ReportPeriod) || 'daily'
  const date = query.date as string | undefined
  const startDate = query.startDate as string | undefined
  const endDate = query.endDate as string | undefined

  if (reportType === 'taxi') {
    const taxiId = (query.taxiId as string)?.trim()
    if (!taxiId) {
      throw createError({ statusCode: 400, message: 'Taxi identifier (taxiId) is required for specific taxi report' })
    }
    const reportData = await boundaryReportService.getTaxiBoundaryReport(taxiId, period, date, startDate, endDate)
    return successResponse(reportData, 'Taxi boundary report retrieved successfully')
  }

  // Fleet report
  const fleetData = await boundaryReportService.getFleetBoundaryReport(period, date, startDate, endDate)
  return successResponse(fleetData, 'Fleet boundary report retrieved successfully')
})
