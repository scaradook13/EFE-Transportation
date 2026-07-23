import { driverRepository, type CreateDriverDto, type UpdateDriverDto, type DriverFilters } from '~~/server/repositories/driverRepository'
import { z } from 'zod'

export const createDriverSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(100),
  address: z.string().min(5, 'Address is required'),
  contactNumber: z.string().min(7, 'Valid contact number required'),
  birthDate: z.string().or(z.date()),
  emergencyContact: z.object({
    name: z.string().min(2, 'Emergency contact name required'),
    relationship: z.string().min(2, 'Relationship required'),
    contactNumber: z.string().min(7, 'Emergency contact number required')
  }),
  licenseNumber: z.string().min(3, 'License number required'),
  licenseExpiration: z.string().or(z.date()),
  photo: z.string().nullable().optional(),
  employmentStatus: z.enum(['Active', 'Inactive']).optional()
})

export const updateDriverSchema = createDriverSchema.partial()

export const driverService = {
  async getAll(filters: DriverFilters, page: number, limit: number) {
    await connectDB()
    return driverRepository.findAll(filters, page, limit)
  },

  async getById(id: string) {
    await connectDB()
    const driver = await driverRepository.findById(id)
    if (!driver) {
      throw createError({ statusCode: 404, message: 'Driver not found' })
    }
    return driver
  },

  async create(data: CreateDriverDto) {
    await connectDB()
    return driverRepository.create(data)
  },

  async update(id: string, data: UpdateDriverDto) {
    await connectDB()
    const driver = await driverRepository.update(id, data)
    if (!driver) {
      throw createError({ statusCode: 404, message: 'Driver not found' })
    }
    return driver
  },

  async remove(id: string) {
    await connectDB()
    const driver = await driverRepository.remove(id)
    if (!driver) {
      throw createError({ statusCode: 404, message: 'Driver not found' })
    }
    return driver
  },

  async getActiveDrivers() {
    await connectDB()
    return driverRepository.findActive()
  }
}
