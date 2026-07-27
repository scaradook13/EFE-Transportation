import { DriverAssignment } from '../models/DriverAssignment'
import { Driver } from '../models/Driver'
import { TaxiUnit } from '../models/TaxiUnit'
import { User } from '../models/User'
import type { FilterQuery } from 'mongoose'
import type { IDriverAssignment } from '../models/DriverAssignment'

export interface AssignmentFilters {
  status?: 'Active' | 'Completed'
  driver?: string
  taxiUnit?: string
  dateFrom?: string
  dateTo?: string
  search?: string
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

    if (filters.search) {
      const searchRegex = new RegExp(filters.search.trim(), 'i')
      
      const [matchingDrivers, matchingTaxis, matchingDispatchers] = await Promise.all([
        Driver.find({ $or: [{ fullName: searchRegex }, { driverId: searchRegex }] }).select('_id'),
        TaxiUnit.find({ $or: [{ taxiNumber: searchRegex }, { plateNumber: searchRegex }, { model: searchRegex }] }).select('_id'),
        User.find({ fullName: searchRegex }).select('_id')
      ])

      const searchOrConditions: any[] = [
        { assignmentNumber: searchRegex },
        { status: searchRegex },
        { remarks: searchRegex },
        {
          $expr: {
            $regexMatch: {
              input: { $dateToString: { format: "%Y-%m-%d %H:%M:%S %b %B", date: "$assignedAt", timezone: "+08:00" } },
              regex: filters.search.trim(),
              options: "i"
            }
          }
        },
        {
          $expr: {
            $regexMatch: {
              input: { $dateToString: { format: "%Y-%m-%d %H:%M:%S %b %B", date: "$timeIn", timezone: "+08:00" } },
              regex: filters.search.trim(),
              options: "i"
            }
          }
        },
        {
          $expr: {
            $regexMatch: {
              input: { 
                $cond: {
                  if: { $ne: ["$timeOut", null] },
                  then: { $dateToString: { format: "%Y-%m-%d %H:%M:%S %b %B", date: "$timeOut", timezone: "+08:00" } },
                  else: ""
                }
              },
              regex: filters.search.trim(),
              options: "i"
            }
          }
        }
      ]

      if (matchingDrivers.length > 0) searchOrConditions.push({ driver: { $in: matchingDrivers.map(d => d._id) } })
      if (matchingTaxis.length > 0) searchOrConditions.push({ taxiUnit: { $in: matchingTaxis.map(t => t._id) } })
      if (matchingDispatchers.length > 0) searchOrConditions.push({ issuedBy: { $in: matchingDispatchers.map(u => u._id) } })

      if (query.$and) {
        query.$and.push({ $or: searchOrConditions })
      } else {
        query.$and = [{ $or: searchOrConditions }]
      }
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
