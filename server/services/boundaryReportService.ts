import mongoose from 'mongoose'
import dayjs from 'dayjs'
import { TaxiUnit, type ITaxiUnit } from '../models/TaxiUnit'
import { DriverAssignment, type IDriverAssignment } from '../models/DriverAssignment'
import { calculateBoundary, formatBoundaryCurrency, formatTaxiType } from '../../shared/utils/boundary'
import { connectDB } from '../utils/database'


import type {
  ReportPeriod,
  BreakdownItem,
  BoundaryReportData,
  FleetBoundaryReportData,
  FleetTaxiSummary
} from '../../app/types'

export type { ReportPeriod, BreakdownItem, BoundaryReportData, FleetBoundaryReportData, FleetTaxiSummary }

export function resolveDateRange(
  period: ReportPeriod,
  dateInput?: string,
  startDateInput?: string,
  endDateInput?: string
): {
  start: Date
  end: Date
  displayLabel: string
  prevDate?: string
  nextDate?: string
  startDateStr: string
  endDateStr: string
} {
  const anchor = (dateInput && dayjs(dateInput).isValid()) ? dayjs(dateInput) : dayjs()

  if (period === 'custom') {
    if (!startDateInput || !endDateInput) {
      throw createError({ statusCode: 400, message: 'Both start date and end date are required for custom date range' })
    }
    const s = dayjs(startDateInput).startOf('day')
    const e = dayjs(endDateInput).endOf('day')
    if (!s.isValid() || !e.isValid()) {
      throw createError({ statusCode: 400, message: 'Invalid start date or end date format' })
    }
    if (e.isBefore(s)) {
      throw createError({ statusCode: 400, message: 'End date must not be earlier than start date' })
    }
    return {
      start: s.toDate(),
      end: e.toDate(),
      displayLabel: `${s.format('MMMM D, YYYY')} – ${e.format('MMMM D, YYYY')}`,
      startDateStr: s.format('YYYY-MM-DD'),
      endDateStr: e.format('YYYY-MM-DD')
    }
  }

  if (period === 'daily') {
    const s = anchor.startOf('day')
    const e = anchor.endOf('day')
    return {
      start: s.toDate(),
      end: e.toDate(),
      displayLabel: anchor.format('MMMM D, YYYY'),
      prevDate: anchor.subtract(1, 'day').format('YYYY-MM-DD'),
      nextDate: anchor.add(1, 'day').format('YYYY-MM-DD'),
      startDateStr: s.format('YYYY-MM-DD'),
      endDateStr: e.format('YYYY-MM-DD')
    }
  }

  if (period === 'weekly') {
    const dayOfWeek = anchor.day() // 0 = Sunday, 1 = Monday, ...
    const monday = dayOfWeek === 0 ? anchor.subtract(6, 'day').startOf('day') : anchor.subtract(dayOfWeek - 1, 'day').startOf('day')
    const sunday = monday.add(6, 'day').endOf('day')
    return {
      start: monday.toDate(),
      end: sunday.toDate(),
      displayLabel: `${monday.format('MMMM D')} – ${sunday.format(monday.month() === sunday.month() ? 'D, YYYY' : 'MMMM D, YYYY')}`,
      prevDate: monday.subtract(7, 'day').format('YYYY-MM-DD'),
      nextDate: monday.add(7, 'day').format('YYYY-MM-DD'),
      startDateStr: monday.format('YYYY-MM-DD'),
      endDateStr: sunday.format('YYYY-MM-DD')
    }
  }

  if (period === 'monthly') {
    const s = anchor.startOf('month')
    const e = anchor.endOf('month')
    return {
      start: s.toDate(),
      end: e.toDate(),
      displayLabel: anchor.format('MMMM YYYY'),
      prevDate: anchor.subtract(1, 'month').format('YYYY-MM-DD'),
      nextDate: anchor.add(1, 'month').format('YYYY-MM-DD'),
      startDateStr: s.format('YYYY-MM-DD'),
      endDateStr: e.format('YYYY-MM-DD')
    }
  }

  // yearly
  const s = anchor.startOf('year')
  const e = anchor.endOf('year')
  return {
    start: s.toDate(),
    end: e.toDate(),
    displayLabel: anchor.format('YYYY'),
    prevDate: anchor.subtract(1, 'year').format('YYYY-MM-DD'),
    nextDate: anchor.add(1, 'year').format('YYYY-MM-DD'),
    startDateStr: s.format('YYYY-MM-DD'),
    endDateStr: e.format('YYYY-MM-DD')
  }
}

export const boundaryReportService = {
  async getTaxiBoundaryReport(
    taxiIdentifier: string,
    period: ReportPeriod = 'daily',
    dateInput?: string,
    startDateInput?: string,
    endDateInput?: string
  ): Promise<BoundaryReportData> {
    await connectDB()

    // 1. Resolve Taxi Unit
    let taxi: ITaxiUnit | null = null
    if (mongoose.Types.ObjectId.isValid(taxiIdentifier)) {
      taxi = await TaxiUnit.findById(taxiIdentifier)
    }
    if (!taxi) {
      taxi = await TaxiUnit.findOne({ taxiNumber: taxiIdentifier })
    }
    if (!taxi) {
      throw createError({ statusCode: 404, message: `Taxi unit '${taxiIdentifier}' not found` })
    }

    // 2. Resolve Date Ranges
    const { start, end, displayLabel, prevDate, nextDate, startDateStr, endDateStr } = resolveDateRange(
      period,
      dateInput,
      startDateInput,
      endDateInput
    )
    const breakdown: BreakdownItem[] = []

    if (period === 'weekly') {
      const monday = dayjs(start)
      const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
      for (let i = 0; i < 7; i++) {
        const d = monday.add(i, 'day')
        breakdown.push({
          label: dayNames[i]!,
          subLabel: d.format('MMM D'),
          date: d.format('YYYY-MM-DD'),
          boundary: 0,
          dispatches: 0,
          totalMinutes: 0,
          totalHours: 0
        })
      }
    } else if (period === 'monthly') {
      const anchor = dayjs(start)
      const daysInMonth = anchor.daysInMonth()
      for (let day = 1; day <= daysInMonth; day++) {
        const d = anchor.date(day)
        breakdown.push({
          label: d.format('MMM D'),
          subLabel: d.format('ddd'),
          date: d.format('YYYY-MM-DD'),
          boundary: 0,
          dispatches: 0,
          totalMinutes: 0,
          totalHours: 0
        })
      }
    } else if (period === 'yearly') {
      const anchor = dayjs(start)
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ]
      for (let m = 0; m < 12; m++) {
        const d = anchor.month(m).startOf('month')
        breakdown.push({
          label: monthNames[m]!,
          subLabel: d.format('MMM'),
          date: d.format('YYYY-MM'),
          boundary: 0,
          dispatches: 0,
          totalMinutes: 0,
          totalHours: 0
        })
      }
    } else if (period === 'custom') {
      // If custom date range is <= 31 days, generate day-by-day intervals
      const sDay = dayjs(start)
      const eDay = dayjs(end)
      const diffDays = eDay.diff(sDay, 'day') + 1
      if (diffDays <= 31) {
        for (let i = 0; i < diffDays; i++) {
          const d = sDay.add(i, 'day')
          breakdown.push({
            label: d.format('MMM D'),
            subLabel: d.format('ddd'),
            date: d.format('YYYY-MM-DD'),
            boundary: 0,
            dispatches: 0,
            totalMinutes: 0,
            totalHours: 0
          })
        }
      }
    }


    // 3. Query Active Assignment (if any)
    const activeDoc = await DriverAssignment.findOne({
      taxiUnit: taxi._id,
      status: 'Active'
    }).populate('driver', 'fullName driverId photo').populate('issuedBy', 'fullName username')

    let activeDeployment = null
    let activeRunningRecord = null

    if (activeDoc) {
      const now = new Date()
      const calc = calculateBoundary(taxi.taxiType, activeDoc.timeIn, now)
      const driverObj = activeDoc.driver as any

      activeDeployment = {
        assignmentId: activeDoc._id.toString(),
        assignmentNumber: activeDoc.assignmentNumber,
        driver: {
          _id: driverObj?._id?.toString() || '',
          fullName: driverObj?.fullName || 'Assigned Driver',
          driverId: driverObj?.driverId || ''
        },
        timeIn: activeDoc.timeIn.toISOString(),
        elapsedMinutes: calc.totalMinutes,
        elapsedHours: calc.elapsedHours,
        formattedElapsed: calc.formattedElapsed,
        currentBoundary: calc.boundary,
        baseBoundary: calc.baseBoundary,
        overtimeHours: calc.overtimeHours
      }

      // If active assignment started within the queried range, include in current period's report
      const activeTimeIn = new Date(activeDoc.timeIn)
      if (activeTimeIn >= start && activeTimeIn <= end) {
        activeRunningRecord = {
          _id: activeDoc._id.toString(),
          assignmentNumber: activeDoc.assignmentNumber,
          driverName: driverObj?.fullName || 'Assigned Driver',
          driverId: driverObj?.driverId || '',
          timeIn: activeDoc.timeIn.toISOString(),
          timeOut: null,
          duration: `${calc.formattedElapsed} (Running)`,
          totalMinutes: calc.totalMinutes,
          boundary: calc.boundary,
          formattedBoundary: formatBoundaryCurrency(calc.boundary),
          overtimeHours: calc.overtimeHours,
          status: 'Active' as const
        }
      }
    }

    // 4. Query Completed Assignments in date range
    const completedAssignments = await DriverAssignment.find({
      taxiUnit: taxi._id,
      status: 'Completed',
      assignedAt: { $gte: start, $lte: end }
    }).populate('driver', 'fullName driverId photo').populate('issuedBy', 'fullName username').sort({ assignedAt: -1 })

    // 5. Compile Records
    const records: BoundaryReportData['records'] = []

    if (activeRunningRecord) {
      records.push(activeRunningRecord)
    }

    for (const a of completedAssignments) {
      const driverObj = a.driver as any
      const totalMins = a.totalMinutes ?? 0
      const h = Math.floor(totalMins / 60)
      const m = totalMins % 60
      const durationStr = h > 0 ? `${h}h ${m}m` : `${m}m`

      records.push({
        _id: a._id.toString(),
        assignmentNumber: a.assignmentNumber,
        driverName: driverObj?.fullName || 'Driver',
        driverId: driverObj?.driverId || '',
        timeIn: a.timeIn.toISOString(),
        timeOut: a.timeOut ? a.timeOut.toISOString() : null,
        duration: durationStr,
        totalMinutes: totalMins,
        boundary: a.boundary ?? 0,
        formattedBoundary: formatBoundaryCurrency(a.boundary ?? 0),
        overtimeHours: a.overtimeHours ?? 0,
        status: 'Completed'
      })
    }

    // 6. Aggregate Breakdown Points
    if (period === 'weekly') {
      for (const rec of records) {
        const dStr = dayjs(rec.timeIn).format('YYYY-MM-DD')
        const item = breakdown.find(b => b.date === dStr)
        if (item) {
          item.boundary += rec.boundary
          item.dispatches += 1
          item.totalMinutes += rec.totalMinutes
          item.totalHours = Math.round((item.totalMinutes / 60) * 10) / 10
        }
      }
    } else if (period === 'monthly') {
      for (const rec of records) {
        const dStr = dayjs(rec.timeIn).format('YYYY-MM-DD')
        const item = breakdown.find(b => b.date === dStr)
        if (item) {
          item.boundary += rec.boundary
          item.dispatches += 1
          item.totalMinutes += rec.totalMinutes
          item.totalHours = Math.round((item.totalMinutes / 60) * 10) / 10
        }
      }
    } else if (period === 'yearly') {
      for (const rec of records) {
        const mStr = dayjs(rec.timeIn).format('YYYY-MM')
        const item = breakdown.find(b => b.date === mStr)
        if (item) {
          item.boundary += rec.boundary
          item.dispatches += 1
          item.totalMinutes += rec.totalMinutes
          item.totalHours = Math.round((item.totalMinutes / 60) * 10) / 10
        }
      }
    } else if (period === 'daily') {
      // For daily breakdown, show each assignment chronologically as a bar
      const sorted = [...records].reverse()
      for (let i = 0; i < sorted.length; i++) {
        const rec = sorted[i]!
        breakdown.push({
          label: rec.driverName,
          subLabel: dayjs(rec.timeIn).format('hh:mm A'),
          date: rec.timeIn,
          boundary: rec.boundary,
          dispatches: 1,
          totalMinutes: rec.totalMinutes,
          totalHours: Math.round((rec.totalMinutes / 60) * 10) / 10
        })
      }
    }

    // 7. Calculate Totals
    const totalBoundary = records.reduce((sum, r) => sum + r.boundary, 0)
    const totalDispatches = records.length
    const totalMinutes = records.reduce((sum, r) => sum + r.totalMinutes, 0)
    const totalHours = Math.round((totalMinutes / 60) * 10) / 10
    const avgBoundary = totalDispatches > 0 ? Math.round(totalBoundary / totalDispatches) : 0

    const hTotal = Math.floor(totalMinutes / 60)
    const mTotal = totalMinutes % 60
    const formattedTotalHours = hTotal > 0 ? `${hTotal}h ${mTotal}m` : `${mTotal}m`

    return {
      taxi: {
        _id: taxi._id.toString(),
        taxiNumber: taxi.taxiNumber,
        plateNumber: taxi.plateNumber,
        brand: taxi.brand,
        model: taxi.model,
        year: taxi.year,
        color: taxi.color,
        taxiType: taxi.taxiType,
        formattedTaxiType: formatTaxiType(taxi.taxiType),
        status: taxi.status
      },
      period,
      dateRange: {
        startDate: dayjs(start).format('YYYY-MM-DD'),
        endDate: dayjs(end).format('YYYY-MM-DD'),
        displayLabel,
        prevDate,
        nextDate
      },
      activeDeployment,
      summary: {
        totalBoundary,
        formattedTotalBoundary: formatBoundaryCurrency(totalBoundary),
        totalDispatches,
        totalMinutes,
        totalHours,
        formattedTotalHours,
        avgBoundary,
        formattedAvgBoundary: formatBoundaryCurrency(avgBoundary)
      },
      breakdown,
      records
    }
  },

  async getFleetBoundaryReport(
    period: ReportPeriod = 'daily',
    dateInput?: string,
    startDateInput?: string,
    endDateInput?: string
  ): Promise<FleetBoundaryReportData> {
    await connectDB()

    const { start, end, displayLabel, prevDate, nextDate, startDateStr, endDateStr } = resolveDateRange(
      period,
      dateInput,
      startDateInput,
      endDateInput
    )

    // 1. Fetch all registered taxis
    const allTaxis = await TaxiUnit.find().sort({ taxiNumber: 1 }).lean()

    // 2. Aggregate completed assignments in period
    const aggregatedCompleted = await DriverAssignment.aggregate([
      {
        $match: {
          status: 'Completed',
          assignedAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: '$taxiUnit',
          dispatches: { $sum: 1 },
          totalMinutes: { $sum: { $ifNull: ['$totalMinutes', 0] } },
          boundary: { $sum: { $ifNull: ['$boundary', 0] } }
        }
      }
    ])

    // 3. Fetch active assignments (usually a small number, needs dynamic boundary calc)
    const activeAssignments = await DriverAssignment.find({
      status: 'Active'
    }).select('taxiUnit timeIn').lean()

    // Group metrics by taxi ID
    const taxiMap = new Map<string, {
      dispatches: number
      totalMinutes: number
      boundary: number
    }>()

    for (const t of allTaxis) {
      taxiMap.set(t._id.toString(), { dispatches: 0, totalMinutes: 0, boundary: 0 })
    }

    // Process aggregated completed data
    for (const agg of aggregatedCompleted) {
      const tId = agg._id?.toString()
      if (tId && taxiMap.has(tId)) {
        const item = taxiMap.get(tId)!
        item.dispatches += agg.dispatches
        item.totalMinutes += agg.totalMinutes
        item.boundary += agg.boundary
      }
    }

    // Aggregate active if timeIn falls in range
    const now = new Date()
    for (const a of activeAssignments) {
      const activeTimeIn = new Date(a.timeIn)
      if (activeTimeIn >= start && activeTimeIn <= end) {
        const tId = (a.taxiUnit as any)?._id?.toString() || a.taxiUnit?.toString()
        if (tId && taxiMap.has(tId)) {
          const item = taxiMap.get(tId)!
          const taxiDoc = allTaxis.find(t => t._id.toString() === tId)
          const taxiType = taxiDoc?.taxiType || 'BATMAN'
          const calc = calculateBoundary(taxiType, a.timeIn, now)
          item.dispatches += 1
          item.totalMinutes += calc.totalMinutes
          item.boundary += calc.boundary
        }
      }
    }

    // Compile list of taxis
    const taxisList: FleetTaxiSummary[] = []
    let totalFleetDispatches = 0
    let totalFleetMinutes = 0
    let totalFleetBoundary = 0
    let activeTaxisInPeriod = 0

    for (const t of allTaxis) {
      const idStr = t._id.toString()
      const m = taxiMap.get(idStr) || { dispatches: 0, totalMinutes: 0, boundary: 0 }
      const totalHours = Math.round((m.totalMinutes / 60) * 10) / 10

      if (m.dispatches > 0) {
        activeTaxisInPeriod += 1
      }
      totalFleetDispatches += m.dispatches
      totalFleetMinutes += m.totalMinutes
      totalFleetBoundary += m.boundary

      taxisList.push({
        _id: idStr,
        taxiNumber: t.taxiNumber,
        plateNumber: t.plateNumber,
        brand: t.brand,
        model: t.model,
        vehicle: `${t.brand} ${t.model}`,
        color: t.color,
        taxiType: t.taxiType,
        formattedTaxiType: formatTaxiType(t.taxiType),
        status: t.status,
        dispatches: m.dispatches,
        totalMinutes: m.totalMinutes,
        totalHours,
        boundary: m.boundary,
        formattedBoundary: formatBoundaryCurrency(m.boundary)
      })
    }

    const totalFleetHours = Math.round((totalFleetMinutes / 60) * 10) / 10
    const hTotal = Math.floor(totalFleetMinutes / 60)
    const mTotal = totalFleetMinutes % 60
    const formattedTotalHours = hTotal > 0 ? `${hTotal}h ${mTotal}m` : `${mTotal}m`
    const avgBoundaryPerTaxi = allTaxis.length > 0 ? Math.round(totalFleetBoundary / allTaxis.length) : 0

    return {
      reportType: 'fleet',
      period,
      dateRange: {
        startDate: startDateStr,
        endDate: endDateStr,
        displayLabel,
        prevDate,
        nextDate
      },
      summary: {
        totalTaxis: allTaxis.length,
        activeTaxisInPeriod,
        totalDispatches: totalFleetDispatches,
        totalMinutes: totalFleetMinutes,
        totalHours: totalFleetHours,
        formattedTotalHours,
        totalBoundary: totalFleetBoundary,
        formattedTotalBoundary: formatBoundaryCurrency(totalFleetBoundary),
        avgBoundaryPerTaxi,
        formattedAvgBoundaryPerTaxi: formatBoundaryCurrency(avgBoundaryPerTaxi)
      },
      taxis: taxisList
    }
  }
}

