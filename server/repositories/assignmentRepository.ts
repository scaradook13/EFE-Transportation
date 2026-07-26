import { DriverAssignment } from '../models/DriverAssignment'
import type { FilterQuery } from 'mongoose'
import type { IDriverAssignment } from '../models/DriverAssignment'

export interface AssignmentFilters {
  status?: 'Active' | 'Completed'
  driver?: string
  taxiUnit?: string
  dateFrom?: string
  dateTo?: string
}

export const assignmentRepository = {
  async findAll(filters: AssignmentFilters = {}, page = 1, limit = 20) {
    const query: FilterQuery<IDriverAssignment> = {}

    if (filters.status) query.status = filters.status
    if (filters.driver) query.driver = filters.driver
    if (filters.taxiUnit) query.taxiUnit = filters.taxiUnit
    if (filters.dateFrom || filters.dateTo) {
      query.assignedAt = {}
      if (filters.dateFrom) query.assignedAt.$gte = new Date(filters.dateFrom)
      if (filters.dateTo) query.assignedAt.$lte = new Date(new Date(filters.dateTo).setHours(23, 59, 59, 999))
    }

    const skip = (page - 1) * limit
    const [data, total] = await Promise.all([
      DriverAssignment.find(query)
        .populate('driver', 'fullName driverId operationalStatus')
        .populate('taxiUnit', 'taxiNumber plateNumber status')
        .populate('issuedBy', 'fullName username role')
        .sort({ assignedAt: -1 })
        .skip(skip)
        .limit(limit),
      DriverAssignment.countDocuments(query)
    ])

    return { data, total, page, limit, pages: Math.ceil(total / limit) }
  },

  async findActive() {
    return DriverAssignment.find({ status: 'Active' })
      .populate('driver', 'fullName driverId photo operationalStatus')
      .populate('taxiUnit', 'taxiNumber plateNumber brand model color status')
      .populate('issuedBy', 'fullName username')
      .sort({ assignedAt: -1 })
  },

  async findByDriver(driverId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit
    const [data, total] = await Promise.all([
      DriverAssignment.find({ driver: driverId })
        .populate('taxiUnit', 'taxiNumber plateNumber brand model')
        .populate('issuedBy', 'fullName username')
        .sort({ assignedAt: -1 })
        .skip(skip)
        .limit(limit),
      DriverAssignment.countDocuments({ driver: driverId })
    ])
    return { data, total, page, limit, pages: Math.ceil(total / limit) }
  },

  async findByTaxi(taxiId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit
    const [data, total] = await Promise.all([
      DriverAssignment.find({ taxiUnit: taxiId })
        .populate('driver', 'fullName driverId')
        .populate('issuedBy', 'fullName username')
        .sort({ assignedAt: -1 })
        .skip(skip)
        .limit(limit),
      DriverAssignment.countDocuments({ taxiUnit: taxiId })
    ])
    return { data, total, page, limit, pages: Math.ceil(total / limit) }
  },

  async findActiveByDriver(driverId: string) {
    return DriverAssignment.findOne({ driver: driverId, status: 'Active' })
  },

  async findActiveByTaxi(taxiId: string) {
    return DriverAssignment.findOne({ taxiUnit: taxiId, status: 'Active' })
  },

  async findById(id: string) {
    return DriverAssignment.findById(id)
      .populate('driver', 'fullName driverId operationalStatus')
      .populate('taxiUnit', 'taxiNumber plateNumber status')
      .populate('issuedBy', 'fullName username')
  },

  async create(data: Partial<IDriverAssignment>) {
    const assignment = new DriverAssignment(data)
    return assignment.save()
  }
}
