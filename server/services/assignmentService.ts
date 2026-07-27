import { assignmentRepository } from '../repositories/assignmentRepository'
import { Driver } from '../models/Driver'
import { TaxiUnit } from '../models/TaxiUnit'

export interface IssueDto {
  driverId: string
  taxiUnitId: string
  issuedBy: string
  remarks?: string
}

export interface ReturnDto {
  assignmentId: string
  remarks?: string
}

export const assignmentService = {
  async issue(dto: IssueDto) {
    // 1. Verify driver exists and is not already active
    const driver = await Driver.findById(dto.driverId)
    if (!driver) {
      throw createError({ statusCode: 404, message: 'Driver not found' })
    }
    if (driver.employmentStatus === 'Inactive') {
      throw createError({ statusCode: 403, message: 'Driver is inactive and cannot be assigned a taxi' })
    }
    if (driver.employmentStatus === 'Expired License') {
      throw createError({ statusCode: 403, message: 'Driver has an expired license and cannot be assigned a taxi' })
    }

    const existingDriverAssignment = await assignmentRepository.findActiveByDriver(dto.driverId)
    if (existingDriverAssignment) {
      throw createError({ statusCode: 409, message: 'Driver already has an active taxi assignment' })
    }

    // 2. Verify taxi exists and is available
    const taxi = await TaxiUnit.findById(dto.taxiUnitId)
    if (!taxi) {
      throw createError({ statusCode: 404, message: 'Taxi unit not found' })
    }
    if (taxi.status !== 'Available') {
      throw createError({ statusCode: 409, message: `Taxi unit is currently ${taxi.status} and cannot be assigned` })
    }

    // 3. Create the assignment — timeIn = server time
    const now = new Date()
    const assignment = await assignmentRepository.create({
      driver: driver._id,
      taxiUnit: taxi._id,
      issuedBy: dto.issuedBy as unknown as import('mongoose').Types.ObjectId,
      assignedAt: now,
      timeIn: now,
      status: 'Active',
      remarks: dto.remarks || ''
    })

    // 4. Update driver and taxi status atomically
    await Promise.all([
      Driver.findByIdAndUpdate(dto.driverId, { operationalStatus: 'Active' }),
      TaxiUnit.findByIdAndUpdate(dto.taxiUnitId, { status: 'In Use' })
    ])

    return assignment
  },

  async return(dto: ReturnDto) {
    const assignment = await assignmentRepository.findById(dto.assignmentId)
    if (!assignment) {
      throw createError({ statusCode: 404, message: 'Assignment not found' })
    }
    if (assignment.status !== 'Active') {
      throw createError({ statusCode: 409, message: 'Assignment is already completed' })
    }

    // Calculate hours worked using server time
    const now = new Date()
    const diffMs = now.getTime() - new Date(assignment.timeIn).getTime()
    const totalMinutes = Math.round(diffMs / 60000)
    const totalHours = Math.round((totalMinutes / 60) * 100) / 100

    // Update assignment
    const driverAssignment = await import('../models/DriverAssignment')
    await driverAssignment.DriverAssignment.findByIdAndUpdate(dto.assignmentId, {
      returnedAt: now,
      timeOut: now,
      totalMinutes,
      totalHours,
      status: 'Completed',
      remarks: dto.remarks || assignment.remarks
    })

    const driverId = (assignment.driver as any)._id || assignment.driver
    const taxiId = (assignment.taxiUnit as any)._id || assignment.taxiUnit

    // Reset driver and taxi status
    await Promise.all([
      Driver.findByIdAndUpdate(driverId, { operationalStatus: 'Available' }),
      TaxiUnit.findByIdAndUpdate(taxiId, { status: 'Available' })
    ])

    return {
      assignmentId: assignment._id,
      totalMinutes,
      totalHours,
      timeIn: assignment.timeIn,
      timeOut: now
    }
  },

  async getStats() {
    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)

    const { DriverAssignment } = await import('../models/DriverAssignment')

    const [
      availableDrivers,
      activeDrivers,
      availableTaxis,
      inUseTaxis,
      maintenanceTaxis,
      todayAssignments,
      todayReturned,
      avgHoursResult
    ] = await Promise.all([
      Driver.countDocuments({ employmentStatus: 'Active', operationalStatus: 'Available' }),
      Driver.countDocuments({ employmentStatus: 'Active', operationalStatus: 'Active' }),
      TaxiUnit.countDocuments({ status: 'Available' }),
      TaxiUnit.countDocuments({ status: 'In Use' }),
      TaxiUnit.countDocuments({ status: 'Maintenance' }),
      DriverAssignment.countDocuments({ assignedAt: { $gte: startOfDay, $lt: endOfDay } }),
      DriverAssignment.countDocuments({ status: 'Completed', returnedAt: { $gte: startOfDay, $lt: endOfDay } }),
      DriverAssignment.aggregate([
        { $match: { status: 'Completed', totalHours: { $ne: null } } },
        { $group: { _id: null, avg: { $avg: '$totalHours' } } }
      ])
    ])

    const avgHours = avgHoursResult[0]?.avg ? Math.round(avgHoursResult[0].avg * 100) / 100 : 0

    // Recent active assignments
    const activeAssignments = await DriverAssignment.find({ status: 'Active' })
      .populate('driver', 'fullName driverId')
      .populate('taxiUnit', 'taxiNumber plateNumber')
      .populate('issuedBy', 'fullName')
      .sort({ assignedAt: -1 })
      .limit(5)

    // Weekly trend (last 7 days)
    const weeklyTrend = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate())
      const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
      const count = await DriverAssignment.countDocuments({
        assignedAt: { $gte: dayStart, $lt: dayEnd }
      })
      weeklyTrend.push({
        date: dayStart.toISOString().split('T')[0],
        count
      })
    }

    return {
      stats: {
        availableDrivers,
        activeDrivers,
        availableTaxis,
        inUseTaxis,
        maintenanceTaxis,
        todayAssignments,
        todayReturned,
        avgHours
      },
      activeAssignments,
      weeklyTrend
    }
  }
}
