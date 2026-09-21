import PDFDocument from 'pdfkit'
import dayjs from 'dayjs'
import type { BoundaryReportData, FleetBoundaryReportData } from '../../app/types'

function formatPdfCurrency(amount: number): string {
  return `PHP ${Number(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const PAGE_BOTTOM_THRESHOLD = 745
const LEFT_MARGIN = 40
const USABLE_WIDTH = 515

export const pdfReportService = {
  /**
   * Generates a vector PDF for a specific taxi boundary report.
   */
  async generateSpecificTaxiPdf(data: BoundaryReportData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          margin: LEFT_MARGIN,
          size: 'A4',
          bufferPages: true
        })

        const buffers: Buffer[] = []
        doc.on('data', b => buffers.push(b))
        doc.on('end', () => resolve(Buffer.concat(buffers)))
        doc.on('error', reject)

        // --- 1. Top Decorative Brand Bar ---
        doc.rect(LEFT_MARGIN, 38, USABLE_WIDTH, 4).fill('#2563EB')

        // --- 2. Header Information ---
        doc.font('Helvetica-Bold').fontSize(17).fillColor('#0F172A').text('EFE TRANSPORTATION', LEFT_MARGIN, 48)
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#64748B').text('TAXI DISPATCH & BOUNDARY MANAGEMENT SYSTEM', LEFT_MARGIN, 68)

        // Right-aligned report header
        doc.font('Helvetica-Bold').fontSize(11).fillColor('#2563EB').text('TAXI BOUNDARY REPORT', 240, 48, { width: 315, align: 'right' })
        doc.font('Helvetica').fontSize(8).fillColor('#64748B').text(`Generated: ${dayjs().format('MMM D, YYYY h:mm A')}`, 240, 64, { width: 315, align: 'right' })
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#0F172A').text(`Period: ${data.dateRange.displayLabel}`, 240, 76, { width: 315, align: 'right' })

        // Horizontal Rule
        doc.strokeColor('#E2E8F0').lineWidth(0.8).moveTo(LEFT_MARGIN, 92).lineTo(LEFT_MARGIN + USABLE_WIDTH, 92).stroke()

        // --- 3. Vehicle & Report Metadata Card ---
        const metaBoxY = 100
        const metaBoxH = 48
        doc.rect(LEFT_MARGIN, metaBoxY, USABLE_WIDTH, metaBoxH).fillAndStroke('#F8FAFC', '#E2E8F0')

        // Col 1: Taxi Number & Type
        doc.font('Helvetica-Bold').fontSize(7).fillColor('#64748B').text('TAXI UNIT', LEFT_MARGIN + 12, metaBoxY + 10)
        doc.font('Helvetica-Bold').fontSize(11).fillColor('#0F172A').text(`Taxi #${data.taxi.taxiNumber}`, LEFT_MARGIN + 12, metaBoxY + 22)
        doc.font('Helvetica').fontSize(8).fillColor('#475569').text(data.taxi.formattedTaxiType, LEFT_MARGIN + 12, metaBoxY + 34)

        // Col 2: Plate & Vehicle Model
        doc.font('Helvetica-Bold').fontSize(7).fillColor('#64748B').text('PLATE & VEHICLE', LEFT_MARGIN + 170, metaBoxY + 10)
        doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#0F172A').text(data.taxi.plateNumber, LEFT_MARGIN + 170, metaBoxY + 22)
        doc.font('Helvetica').fontSize(8).fillColor('#475569').text(`${data.taxi.brand} ${data.taxi.model} (${data.taxi.year})`, LEFT_MARGIN + 170, metaBoxY + 34)

        // Col 3: Status & Color
        doc.font('Helvetica-Bold').fontSize(7).fillColor('#64748B').text('COLOR & STATUS', LEFT_MARGIN + 360, metaBoxY + 10)
        doc.font('Helvetica-Bold').fontSize(9.5).fillColor(data.taxi.status === 'Active' ? '#059669' : '#0F172A').text(data.taxi.status.toUpperCase(), LEFT_MARGIN + 360, metaBoxY + 22)
        doc.font('Helvetica').fontSize(8).fillColor('#475569').text(data.taxi.color, LEFT_MARGIN + 360, metaBoxY + 34)

        // --- 4. KPI Summary Cards ---
        const kpiY = 158
        const kpiH = 44
        const kpiSpacing = 9
        const kpiW = (USABLE_WIDTH - (3 * kpiSpacing)) / 4

        const kpis = [
          { label: 'TOTAL BOUNDARY', value: formatPdfCurrency(data.summary.totalBoundary), color: '#2563EB' },
          { label: 'DISPATCHES', value: `${data.summary.totalDispatches} Shifts`, color: '#0F172A' },
          { label: 'DUTY DURATION', value: data.summary.formattedTotalHours, color: '#0F172A' },
          { label: 'AVG / DISPATCH', value: formatPdfCurrency(data.summary.avgBoundary), color: '#0F172A' }
        ]

        kpis.forEach((kpi, idx) => {
          const x = LEFT_MARGIN + idx * (kpiW + kpiSpacing)
          doc.rect(x, kpiY, kpiW, kpiH).fillAndStroke('#F1F5F9', '#CBD5E1')
          doc.font('Helvetica-Bold').fontSize(6.5).fillColor('#64748B').text(kpi.label, x + 8, kpiY + 8)
          doc.font('Helvetica-Bold').fontSize(10.5).fillColor(kpi.color).text(kpi.value, x + 8, kpiY + 22, { width: kpiW - 16, ellipsis: true })
        })

        // --- 5. Table Section ---
        let currentY = 216
        doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#0F172A').text('DISPATCH & BOUNDARY LOG', LEFT_MARGIN, currentY)
        currentY += 16

        // Table Column Config
        // Total = 70 + 115 + 75 + 75 + 70 + 110 = 515
        const cols = {
          date: { x: LEFT_MARGIN + 6, w: 68 },
          driver: { x: LEFT_MARGIN + 76, w: 120 },
          timeIn: { x: LEFT_MARGIN + 198, w: 72 },
          timeOut: { x: LEFT_MARGIN + 272, w: 72 },
          duration: { x: LEFT_MARGIN + 346, w: 68 },
          boundary: { x: LEFT_MARGIN + 416, w: 93 }
        }

        const drawTableHeader = () => {
          doc.rect(LEFT_MARGIN, currentY, USABLE_WIDTH, 18).fill('#1E293B')
          doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#FFFFFF')
          doc.text('DATE', cols.date.x, currentY + 5)
          doc.text('DRIVER', cols.driver.x, currentY + 5)
          doc.text('TIME IN', cols.timeIn.x, currentY + 5)
          doc.text('TIME OUT', cols.timeOut.x, currentY + 5)
          doc.text('DURATION', cols.duration.x, currentY + 5)
          doc.text('BOUNDARY', cols.boundary.x, currentY + 5, { width: cols.boundary.w, align: 'right' })
          currentY += 18
        }

        drawTableHeader()

        // Table Rows
        if (!data.records || data.records.length === 0) {
          doc.rect(LEFT_MARGIN, currentY, USABLE_WIDTH, 26).fillAndStroke('#FFFFFF', '#E2E8F0')
          doc.font('Helvetica-Oblique').fontSize(8.5).fillColor('#64748B').text('No boundary records found for the selected period.', LEFT_MARGIN, currentY + 8, { width: USABLE_WIDTH, align: 'center' })
          currentY += 26
        } else {
          data.records.forEach((rec, idx) => {
            if (currentY + 20 > PAGE_BOTTOM_THRESHOLD) {
              doc.addPage()
              currentY = 40
              drawTableHeader()
            }

            const rowBg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC'
            doc.rect(LEFT_MARGIN, currentY, USABLE_WIDTH, 19).fillAndStroke(rowBg, '#F1F5F9')

            const dateStr = dayjs(rec.timeIn).format('MM/DD/YYYY')
            const timeInStr = dayjs(rec.timeIn).format('hh:mm A')
            const timeOutStr = rec.timeOut ? dayjs(rec.timeOut).format('hh:mm A') : 'In Transit'
            const isRunning = rec.status === 'Active'

            doc.font('Helvetica').fontSize(7.5).fillColor('#0F172A')
            doc.text(dateStr, cols.date.x, currentY + 5)

            // Driver with running indicator
            if (isRunning) {
              doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#059669').text(`${rec.driverName} (Active)`, cols.driver.x, currentY + 5, { width: cols.driver.w, ellipsis: true })
            } else {
              doc.font('Helvetica').fontSize(7.5).fillColor('#0F172A').text(rec.driverName, cols.driver.x, currentY + 5, { width: cols.driver.w, ellipsis: true })
            }

            doc.font('Helvetica').fontSize(7.5).fillColor('#475569')
            doc.text(timeInStr, cols.timeIn.x, currentY + 5)
            doc.text(timeOutStr, cols.timeOut.x, currentY + 5)
            doc.text(rec.duration, cols.duration.x, currentY + 5)

            // Boundary
            doc.font('Helvetica-Bold').fontSize(7.5).fillColor(isRunning ? '#059669' : '#0F172A')
            doc.text(formatPdfCurrency(rec.boundary), cols.boundary.x, currentY + 5, { width: cols.boundary.w, align: 'right' })

            currentY += 19
          })

          // Total Summary Row
          if (currentY + 22 > PAGE_BOTTOM_THRESHOLD) {
            doc.addPage()
            currentY = 40
          }

          doc.rect(LEFT_MARGIN, currentY, USABLE_WIDTH, 20).fillAndStroke('#E2E8F0', '#CBD5E1')
          doc.font('Helvetica-Bold').fontSize(8).fillColor('#0F172A')
          doc.text('TOTAL', cols.date.x, currentY + 5)
          doc.text(`${data.summary.totalDispatches} Shifts`, cols.driver.x, currentY + 5)
          doc.text(data.summary.formattedTotalHours, cols.duration.x, currentY + 5)
          doc.text(formatPdfCurrency(data.summary.totalBoundary), cols.boundary.x, currentY + 5, { width: cols.boundary.w, align: 'right' })
          currentY += 20
        }

        // --- 6. Dynamic Footer Pass ---
        const pageRange = doc.bufferedPageRange()
        for (let i = pageRange.start; i < pageRange.start + pageRange.count; i++) {
          doc.switchToPage(i)
          doc.strokeColor('#CBD5E1').lineWidth(0.5).moveTo(LEFT_MARGIN, 785).lineTo(LEFT_MARGIN + USABLE_WIDTH, 785).stroke()
          doc.font('Helvetica').fontSize(7.5).fillColor('#64748B')
            .text('EFE Transportation Taxi Dispatch System — Official Financial & Boundary Record', LEFT_MARGIN, 792, { width: 340, align: 'left' })
          doc.font('Helvetica').fontSize(7.5).fillColor('#64748B')
            .text(`Page ${i + 1} of ${pageRange.count}`, LEFT_MARGIN + 350, 792, { width: 165, align: 'right' })
        }

        doc.end()
      } catch (err) {
        reject(err)
      }
    })
  },

  /**
   * Generates a vector PDF for the overall fleet boundary and income report.
   */
  async generateFleetPdf(data: FleetBoundaryReportData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          margin: LEFT_MARGIN,
          size: 'A4',
          bufferPages: true
        })

        const buffers: Buffer[] = []
        doc.on('data', b => buffers.push(b))
        doc.on('end', () => resolve(Buffer.concat(buffers)))
        doc.on('error', reject)

        // --- 1. Top Decorative Brand Bar ---
        doc.rect(LEFT_MARGIN, 38, USABLE_WIDTH, 4).fill('#2563EB')

        // --- 2. Header Information ---
        doc.font('Helvetica-Bold').fontSize(17).fillColor('#0F172A').text('EFE TRANSPORTATION', LEFT_MARGIN, 48)
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#64748B').text('TAXI DISPATCH & BOUNDARY MANAGEMENT SYSTEM', LEFT_MARGIN, 68)

        // Right-aligned report header
        doc.font('Helvetica-Bold').fontSize(11).fillColor('#2563EB').text('FLEET INCOME REPORT', 240, 48, { width: 315, align: 'right' })
        doc.font('Helvetica').fontSize(8).fillColor('#64748B').text(`Generated: ${dayjs().format('MMM D, YYYY h:mm A')}`, 240, 64, { width: 315, align: 'right' })
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#0F172A').text(`Period: ${data.dateRange.displayLabel}`, 240, 76, { width: 315, align: 'right' })

        // Horizontal Rule
        doc.strokeColor('#E2E8F0').lineWidth(0.8).moveTo(LEFT_MARGIN, 92).lineTo(LEFT_MARGIN + USABLE_WIDTH, 92).stroke()

        // --- 3. Fleet Metadata Card ---
        const metaBoxY = 100
        const metaBoxH = 48
        doc.rect(LEFT_MARGIN, metaBoxY, USABLE_WIDTH, metaBoxH).fillAndStroke('#F8FAFC', '#E2E8F0')

        // Col 1: Scope
        doc.font('Helvetica-Bold').fontSize(7).fillColor('#64748B').text('REPORT SCOPE', LEFT_MARGIN + 12, metaBoxY + 10)
        doc.font('Helvetica-Bold').fontSize(10.5).fillColor('#0F172A').text('Entire Taxi Fleet', LEFT_MARGIN + 12, metaBoxY + 22)
        doc.font('Helvetica').fontSize(8).fillColor('#475569').text('All Registered Taxi Units', LEFT_MARGIN + 12, metaBoxY + 34)

        // Col 2: Fleet Size & Active Units
        doc.font('Helvetica-Bold').fontSize(7).fillColor('#64748B').text('FLEET ACTIVITY', LEFT_MARGIN + 180, metaBoxY + 10)
        doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#0F172A').text(`${data.summary.totalTaxis} Total Units`, LEFT_MARGIN + 180, metaBoxY + 22)
        doc.font('Helvetica').fontSize(8).fillColor('#475569').text(`${data.summary.activeTaxisInPeriod} Active with Dispatches`, LEFT_MARGIN + 180, metaBoxY + 34)

        // Col 3: Report Timeline
        doc.font('Helvetica-Bold').fontSize(7).fillColor('#64748B').text('TIMELINE MODE', LEFT_MARGIN + 360, metaBoxY + 10)
        doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#2563EB').text(data.period.toUpperCase(), LEFT_MARGIN + 360, metaBoxY + 22)
        doc.font('Helvetica').fontSize(8).fillColor('#475569').text(data.dateRange.startDate === data.dateRange.endDate ? data.dateRange.startDate : `${data.dateRange.startDate} to ${data.dateRange.endDate}`, LEFT_MARGIN + 360, metaBoxY + 34)

        // --- 4. KPI Summary Cards ---
        const kpiY = 158
        const kpiH = 44
        const kpiSpacing = 9
        const kpiW = (USABLE_WIDTH - (3 * kpiSpacing)) / 4

        const kpis = [
          { label: 'FLEET BOUNDARY', value: formatPdfCurrency(data.summary.totalBoundary), color: '#2563EB' },
          { label: 'TOTAL DISPATCHES', value: `${data.summary.totalDispatches} Shifts`, color: '#0F172A' },
          { label: 'TOTAL DUTY HOURS', value: data.summary.formattedTotalHours, color: '#0F172A' },
          { label: 'AVG / TAXI UNIT', value: formatPdfCurrency(data.summary.avgBoundaryPerTaxi), color: '#0F172A' }
        ]

        kpis.forEach((kpi, idx) => {
          const x = LEFT_MARGIN + idx * (kpiW + kpiSpacing)
          doc.rect(x, kpiY, kpiW, kpiH).fillAndStroke('#F1F5F9', '#CBD5E1')
          doc.font('Helvetica-Bold').fontSize(6.5).fillColor('#64748B').text(kpi.label, x + 8, kpiY + 8)
          doc.font('Helvetica-Bold').fontSize(10.5).fillColor(kpi.color).text(kpi.value, x + 8, kpiY + 22, { width: kpiW - 16, ellipsis: true })
        })

        // --- 5. Table Section ---
        let currentY = 216
        doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#0F172A').text('FLEET VEHICLE SUMMARY', LEFT_MARGIN, currentY)
        currentY += 16

        // Table Column Config
        // Widths: 55 + 65 + 75 + 105 + 55 + 65 + 95 = 515
        const cols = {
          taxiNum: { x: LEFT_MARGIN + 6, w: 50 },
          type: { x: LEFT_MARGIN + 60, w: 62 },
          plate: { x: LEFT_MARGIN + 126, w: 72 },
          vehicle: { x: LEFT_MARGIN + 202, w: 105 },
          dispatches: { x: LEFT_MARGIN + 311, w: 50 },
          hours: { x: LEFT_MARGIN + 365, w: 60 },
          boundary: { x: LEFT_MARGIN + 429, w: 80 }
        }

        const drawTableHeader = () => {
          doc.rect(LEFT_MARGIN, currentY, USABLE_WIDTH, 18).fill('#1E293B')
          doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#FFFFFF')
          doc.text('TAXI #', cols.taxiNum.x, currentY + 5)
          doc.text('TYPE', cols.type.x, currentY + 5)
          doc.text('PLATE #', cols.plate.x, currentY + 5)
          doc.text('VEHICLE', cols.vehicle.x, currentY + 5)
          doc.text('SHIFTS', cols.dispatches.x, currentY + 5, { width: cols.dispatches.w, align: 'center' })
          doc.text('HOURS', cols.hours.x, currentY + 5, { width: cols.hours.w, align: 'center' })
          doc.text('BOUNDARY', cols.boundary.x, currentY + 5, { width: cols.boundary.w, align: 'right' })
          currentY += 18
        }

        drawTableHeader()

        if (!data.taxis || data.taxis.length === 0) {
          doc.rect(LEFT_MARGIN, currentY, USABLE_WIDTH, 26).fillAndStroke('#FFFFFF', '#E2E8F0')
          doc.font('Helvetica-Oblique').fontSize(8.5).fillColor('#64748B').text('No taxi units registered.', LEFT_MARGIN, currentY + 8, { width: USABLE_WIDTH, align: 'center' })
          currentY += 26
        } else {
          data.taxis.forEach((t, idx) => {
            if (currentY + 20 > PAGE_BOTTOM_THRESHOLD) {
              doc.addPage()
              currentY = 40
              drawTableHeader()
            }

            const rowBg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC'
            doc.rect(LEFT_MARGIN, currentY, USABLE_WIDTH, 19).fillAndStroke(rowBg, '#F1F5F9')

            doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#0F172A').text(`#${t.taxiNumber}`, cols.taxiNum.x, currentY + 5)
            doc.font('Helvetica').fontSize(7.5).fillColor('#475569').text(t.formattedTaxiType, cols.type.x, currentY + 5)
            doc.font('Helvetica').fontSize(7.5).fillColor('#0F172A').text(t.plateNumber, cols.plate.x, currentY + 5)
            doc.font('Helvetica').fontSize(7.5).fillColor('#475569').text(t.vehicle, cols.vehicle.x, currentY + 5, { width: cols.vehicle.w, ellipsis: true })
            doc.font('Helvetica').fontSize(7.5).fillColor('#0F172A').text(`${t.dispatches}`, cols.dispatches.x, currentY + 5, { width: cols.dispatches.w, align: 'center' })
            doc.font('Helvetica').fontSize(7.5).fillColor('#475569').text(`${t.totalHours}h`, cols.hours.x, currentY + 5, { width: cols.hours.w, align: 'center' })
            doc.font('Helvetica-Bold').fontSize(7.5).fillColor(t.boundary > 0 ? '#0F172A' : '#94A3B8').text(formatPdfCurrency(t.boundary), cols.boundary.x, currentY + 5, { width: cols.boundary.w, align: 'right' })

            currentY += 19
          })

          // Total Summary Row
          if (currentY + 22 > PAGE_BOTTOM_THRESHOLD) {
            doc.addPage()
            currentY = 40
          }

          doc.rect(LEFT_MARGIN, currentY, USABLE_WIDTH, 20).fillAndStroke('#E2E8F0', '#CBD5E1')
          doc.font('Helvetica-Bold').fontSize(8).fillColor('#0F172A')
          doc.text('FLEET TOTAL', cols.taxiNum.x, currentY + 5)
          doc.text(`${data.summary.totalDispatches}`, cols.dispatches.x, currentY + 5, { width: cols.dispatches.w, align: 'center' })
          doc.text(`${data.summary.totalHours}h`, cols.hours.x, currentY + 5, { width: cols.hours.w, align: 'center' })
          doc.text(formatPdfCurrency(data.summary.totalBoundary), cols.boundary.x, currentY + 5, { width: cols.boundary.w, align: 'right' })
          currentY += 20
        }

        // --- 6. Dynamic Footer Pass ---
        const pageRange = doc.bufferedPageRange()
        for (let i = pageRange.start; i < pageRange.start + pageRange.count; i++) {
          doc.switchToPage(i)
          doc.strokeColor('#CBD5E1').lineWidth(0.5).moveTo(LEFT_MARGIN, 785).lineTo(LEFT_MARGIN + USABLE_WIDTH, 785).stroke()
          doc.font('Helvetica').fontSize(7.5).fillColor('#64748B')
            .text('EFE Transportation Taxi Dispatch System — Official Financial & Boundary Record', LEFT_MARGIN, 792, { width: 340, align: 'left' })
          doc.font('Helvetica').fontSize(7.5).fillColor('#64748B')
            .text(`Page ${i + 1} of ${pageRange.count}`, LEFT_MARGIN + 350, 792, { width: 165, align: 'right' })
        }

        doc.end()
      } catch (err) {
        reject(err)
      }
    })
  }
}
