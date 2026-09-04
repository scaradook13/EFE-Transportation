import { driverRepository, type CreateDriverDto, type UpdateDriverDto, type DriverFilters } from '~~/server/repositories/driverRepository'
import { Driver } from '~~/server/models/Driver'



export const driverService = {
  async getAll(filters: DriverFilters, page: number, limit: number) {
    await connectDB()
    
    // Auto-validate licenses (Expire if License Expiration Date < Today)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    await Driver.updateMany(
      { licenseExpiration: { $lt: today }, employmentStatus: { $ne: 'Expired License' } },
      { $set: { employmentStatus: 'Expired License', operationalStatus: 'Not Available' } }
    )

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
    if (data.employmentStatus === 'Inactive' || data.employmentStatus === 'Expired License') {
      data.operationalStatus = 'Not Available'
    } else if (data.licenseExpiration) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (new Date(data.licenseExpiration) < today) {
        data.employmentStatus = 'Expired License'
        data.operationalStatus = 'Not Available'
      }
    }
    return driverRepository.create(data)
  },

  async update(id: string, data: UpdateDriverDto) {
    await connectDB()
    const existingDriver = await driverRepository.findById(id)
    if (!existingDriver) {
      throw createError({ statusCode: 404, message: 'Driver not found' })
    }
    
    if (data.employmentStatus === 'Active') {
      // Check if driver has no active assignment
      if (existingDriver.operationalStatus !== 'Active') {
        data.operationalStatus = 'Available'
      }
    } else if (data.employmentStatus === 'Inactive' || data.employmentStatus === 'Expired License') {
      data.operationalStatus = 'Not Available'
    } else if (data.licenseExpiration) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (new Date(data.licenseExpiration) < today) {
        data.employmentStatus = 'Expired License'
        data.operationalStatus = 'Not Available'
      }
    }
    
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
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    await Driver.updateMany(
      { licenseExpiration: { $lt: today }, employmentStatus: { $ne: 'Expired License' } },
      { $set: { employmentStatus: 'Expired License', operationalStatus: 'Not Available' } }
    )

    return driverRepository.findActive()
  }
}
