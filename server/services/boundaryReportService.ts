import mongoose from 'mongoose'
import dayjs from 'dayjs'
import { TaxiUnit, type ITaxiUnit } from '../models/TaxiUnit'
import { DriverAssignment, type IDriverAssignment } from '../models/DriverAssignment'
import { calculateBoundary, formatBoundaryCurrency, formatTaxiType } from '../../shared/utils/boundary'


export type ReportPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly'

export interface BreakdownItem {
  label: string
  subLabel?: string
  date: string
  boundary: number
  dispatches: number
  totalMinutes: number
  totalHours: number
}

export interface BoundaryReportData {
  taxi: {
    _id: string
    taxiNumber: string
    plateNumber: string
    brand: string
    model: string
    year: number
    color: string
    taxiType: 'BATMAN' | 'SUPERMAN'
    formattedTaxiType: string
    status: string
  }
  period: ReportPeriod
  dateRange: {
    startDate: string
    endDate: string
    displayLabel: string
    prevDate: string
    nextDate: string
  }
  activeDeployment: {
    assignmentId: string
    assignmentNumber: string
    driver: {
      _id: string
      fullName: string
      driverId: string
    }
    timeIn: string
    elapsedMinutes: number
    elapsedHours: number
    formattedElapsed: string
    currentBoundary: number
    baseBoundary: number
    overtimeHours: number
  } | null
  summary: {
    totalBoundary: number
    formattedTotalBoundary: string
    totalDispatches: number
    totalMinutes: number
    totalHours: number
    formattedTotalHours: string
    avgBoundary: number
    formattedAvgBoundary: string
  }
  breakdown: BreakdownItem[]
  records: Array<{
    _id: string
    assignmentNumber: string
    driverName: string
    driverId: string
    timeIn: string
    timeOut: string | null
    duration: string
    totalMinutes: number
    boundary: number
    formattedBoundary: string
    overtimeHours: number
    status: 'Active' | 'Completed'
  }>
}

export const boundaryReportService = {
  async getTaxiBoundaryReport(
    taxiIdentifier: string,
    period: ReportPeriod = 'daily',
    dateInput?: string
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

    // 2. Resolve Anchor Date and Period Date Ranges
    const anchor = (dateInput && dayjs(dateInput).isValid()) ? dayjs(dateInput) : dayjs()
    let start: Date
    let end: Date
    let displayLabel: string
    let prevDate: string
    let nextDate: string
    const breakdown: BreakdownItem[] = []

    if (period === 'daily') {
      start = anchor.startOf('day').toDate()
      end = anchor.endOf('day').toDate()
      displayLabel = anchor.format('MMMM D, YYYY')
      prevDate = anchor.subtract(1, 'day').format('YYYY-MM-DD')
      nextDate = anchor.add(1, 'day').format('YYYY-MM-DD')
    } else if (period === 'weekly') {
      // Monday to Sunday
      const dayOfWeek = anchor.day() // 0 = Sunday, 1 = Monday, ...
      const monday = dayOfWeek === 0 ? anchor.subtract(6, 'day').startOf('day') : anchor.subtract(dayOfWeek - 1, 'day').startOf('day')
      const sunday = monday.add(6, 'day').endOf('day')
      start = monday.toDate()
      end = sunday.toDate()

      displayLabel = `${monday.format('MMMM D')} – ${sunday.format(monday.month() === sunday.month() ? 'D, YYYY' : 'MMMM D, YYYY')}`
      prevDate = monday.subtract(7, 'day').format('YYYY-MM-DD')
      nextDate = monday.add(7, 'day').format('YYYY-MM-DD')

      // Initialize 7 days breakdown
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
      const monthStart = anchor.startOf('month')
      const monthEnd = anchor.endOf('month')
      start = monthStart.toDate()
      end = monthEnd.toDate()

      displayLabel = anchor.format('MMMM YYYY')
      prevDate = anchor.subtract(1, 'month').format('YYYY-MM-DD')
      nextDate = anchor.add(1, 'month').format('YYYY-MM-DD')

      // Initialize all days of the month
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
    } else {
      // Yearly
      const yearStart = anchor.startOf('year')
      const yearEnd = anchor.endOf('year')
      start = yearStart.toDate()
      end = yearEnd.toDate()

      displayLabel = anchor.format('YYYY')
      prevDate = anchor.subtract(1, 'year').format('YYYY-MM-DD')
      nextDate = anchor.add(1, 'year').format('YYYY-MM-DD')

      // Initialize 12 months
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
  }
}
