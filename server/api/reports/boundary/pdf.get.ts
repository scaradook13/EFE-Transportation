import { boundaryReportService } from '../../../services/boundaryReportService'
import { pdfReportService } from '../../../services/pdfReportService'
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

  let pdfBuffer: Buffer
  let filename: string

  if (reportType === 'taxi') {
    const taxiId = (query.taxiId as string)?.trim()
    if (!taxiId) {
      throw createError({ statusCode: 400, message: 'Taxi identifier (taxiId) is required for specific taxi report' })
    }
    const reportData = await boundaryReportService.getTaxiBoundaryReport(taxiId, period, date, startDate, endDate)
    pdfBuffer = await pdfReportService.generateSpecificTaxiPdf(reportData)
    filename = `Taxi_${reportData.taxi.taxiNumber}_Boundary_Report_${reportData.dateRange.startDate}_to_${reportData.dateRange.endDate}.pdf`
  } else {
    const fleetData = await boundaryReportService.getFleetBoundaryReport(period, date, startDate, endDate)
    pdfBuffer = await pdfReportService.generateFleetPdf(fleetData)
    filename = `Fleet_Income_Report_${fleetData.dateRange.startDate}_to_${fleetData.dateRange.endDate}.pdf`
  }

  setResponseHeader(event, 'Content-Type', 'application/pdf')
  setResponseHeader(event, 'Content-Disposition', `attachment; filename="${filename}"`)
  setResponseHeader(event, 'Content-Length', pdfBuffer.length)

  return pdfBuffer
})
