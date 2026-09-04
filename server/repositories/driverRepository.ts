import { Driver, type IDriver, type EmploymentStatus, type OperationalStatus } from '~~/server/models/Driver'
import type { FilterQuery } from 'mongoose'
import mongoose from 'mongoose'

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
  photoFileId?: string | null
  tinId?: string
  sssId?: string
  philhealthId?: string
  pagibigId?: string
  dateHired?: Date | string | null
  employmentStatus?: EmploymentStatus
  operationalStatus?: OperationalStatus
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
  photoFileId?: string | null
  tinId?: string
  sssId?: string
  philhealthId?: string
  pagibigId?: string
  dateHired?: Date | string | null
  employmentStatus?: EmploymentStatus
  operationalStatus?: OperationalStatus
  updatedBy?: string
}

export interface DriverFilters {
  employmentStatus?: EmploymentStatus
  operationalStatus?: 'Available' | 'Active'
  search?: string
}

export const driverRepository = {
  async findAll(filters: DriverFilters = {}, page = 1, limit = 10) {
    const query: FilterQuery<IDriver> = {}

    if (filters.employmentStatus) query.employmentStatus = filters.employmentStatus
    if (filters.operationalStatus) query.operationalStatus = filters.operationalStatus
    if (filters.search) {
      query.$or = [
        { fullName: { $regex: filters.search, $options: 'i' } },
        { driverId: { $regex: filters.search, $options: 'i' } },
        { licenseNumber: { $regex: filters.search, $options: 'i' } },
        { contactNumber: { $regex: filters.search, $options: 'i' } },
        { tinId: { $regex: filters.search, $options: 'i' } },
        { sssId: { $regex: filters.search, $options: 'i' } },
        { philhealthId: { $regex: filters.search, $options: 'i' } },
        { pagibigId: { $regex: filters.search, $options: 'i' } }
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
    // If a new photo is uploaded and an old one exists in GridFS, clean it up
    if (data.photoFileId !== undefined) {
      const oldDriver = await Driver.findById(id)
      if (oldDriver && oldDriver.photoFileId && oldDriver.photoFileId.toString() !== data.photoFileId) {
        if (mongoose.connection.db) {
          try {
            const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'photos' })
            await bucket.delete(new mongoose.Types.ObjectId(oldDriver.photoFileId.toString()))
          } catch (e) {
            console.error('Failed to delete old GridFS photo:', e)
          }
        }
      }
    }
    
    return Driver.findByIdAndUpdate(id, data, { new: true, runValidators: true })
      .populate('createdBy', 'fullName username')
      .populate('updatedBy', 'fullName username')
  },

  async remove(id: string) {
    const driver = await Driver.findById(id)
    if (driver && driver.photoFileId) {
      if (mongoose.connection.db) {
        try {
          const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'photos' })
          await bucket.delete(new mongoose.Types.ObjectId(driver.photoFileId.toString()))
        } catch (e) {
          console.error('Failed to delete GridFS photo on driver removal:', e)
        }
      }
    }
    return Driver.findByIdAndDelete(id)
  },

  async count(filter: FilterQuery<IDriver> = {}) {
    return Driver.countDocuments(filter)
  },

  async findActive() {
    return Driver.find({ employmentStatus: 'Active' }).select('_id fullName driverId')
  }
}
