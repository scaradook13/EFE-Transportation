import { Driver, type IDriver, type EmploymentStatus } from '~~/server/models/Driver'
import type { FilterQuery } from 'mongoose'

export interface CreateDriverDto {
  fullName: string
  address: string
  contactNumber: string
  birthDate: Date | string
  emergencyContact: {
    name: string
    relationship: string
    contactNumber: string
  }
  licenseNumber: string
  licenseExpiration: Date | string
  photo?: string | null
  employmentStatus?: EmploymentStatus
  createdBy: string
}

export interface UpdateDriverDto {
  fullName?: string
  address?: string
  contactNumber?: string
  birthDate?: Date | string
  emergencyContact?: {
    name: string
    relationship: string
    contactNumber: string
  }
  licenseNumber?: string
  licenseExpiration?: Date | string
  photo?: string | null
  employmentStatus?: EmploymentStatus
  updatedBy?: string
}

export interface DriverFilters {
  employmentStatus?: EmploymentStatus
  search?: string
}

export const driverRepository = {
  async findAll(filters: DriverFilters = {}, page = 1, limit = 10) {
    const query: FilterQuery<IDriver> = {}

    if (filters.employmentStatus) query.employmentStatus = filters.employmentStatus
    if (filters.search) {
      query.$or = [
        { fullName: { $regex: filters.search, $options: 'i' } },
        { driverId: { $regex: filters.search, $options: 'i' } },
        { licenseNumber: { $regex: filters.search, $options: 'i' } },
        { contactNumber: { $regex: filters.search, $options: 'i' } }
      ]
    }

    const skip = (page - 1) * limit
    const [data, total] = await Promise.all([
      Driver.find(query)
        .populate('createdBy', 'fullName username')
        .populate('updatedBy', 'fullName username')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      Driver.countDocuments(query)
    ])

    return { data, total, page, limit, pages: Math.ceil(total / limit) }
  },

  async findById(id: string) {
    return Driver.findById(id)
      .populate('createdBy', 'fullName username')
      .populate('updatedBy', 'fullName username')
  },

  async findByDriverId(driverId: string) {
    return Driver.findOne({ driverId })
  },

  async create(data: CreateDriverDto) {
    const driver = new Driver(data)
    return driver.save()
  },

  async update(id: string, data: UpdateDriverDto) {
    return Driver.findByIdAndUpdate(id, data, { new: true, runValidators: true })
      .populate('createdBy', 'fullName username')
      .populate('updatedBy', 'fullName username')
  },

  async remove(id: string) {
    return Driver.findByIdAndDelete(id)
  },

  async count(filter: FilterQuery<IDriver> = {}) {
    return Driver.countDocuments(filter)
  },

  async findActive() {
    return Driver.find({ employmentStatus: 'Active' }).select('_id fullName driverId')
  }
}
