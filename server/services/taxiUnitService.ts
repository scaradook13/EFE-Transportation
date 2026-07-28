import { taxiUnitRepository, type CreateTaxiUnitDto, type UpdateTaxiUnitDto, type TaxiUnitFilters } from '~~/server/repositories/taxiUnitRepository'
import { z } from 'zod'



export const taxiUnitService = {
  async getAll(filters: TaxiUnitFilters, page: number, limit: number) {
    await connectDB()
    return taxiUnitRepository.findAll(filters, page, limit)
  },

  async getById(id: string) {
    await connectDB()
    const unit = await taxiUnitRepository.findById(id)
    if (!unit) {
      throw createError({ statusCode: 404, message: 'Taxi unit not found' })
    }
    return unit
  },

  async create(data: CreateTaxiUnitDto) {
    await connectDB()
    return taxiUnitRepository.create(data)
  },

  async update(id: string, data: UpdateTaxiUnitDto) {
    await connectDB()
    const unit = await taxiUnitRepository.update(id, data)
    if (!unit) {
      throw createError({ statusCode: 404, message: 'Taxi unit not found' })
    }
    return unit
  },

  async remove(id: string) {
    await connectDB()
    const unit = await taxiUnitRepository.remove(id)
    if (!unit) {
      throw createError({ statusCode: 404, message: 'Taxi unit not found' })
    }
    return unit
  },

  async getAvailableUnits() {
    await connectDB()
    return taxiUnitRepository.findAvailable()
  }
}
