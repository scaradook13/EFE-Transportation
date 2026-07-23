import { TaxiUnit, type ITaxiUnit, type TaxiUnitStatus } from '~~/server/models/TaxiUnit'
import type { FilterQuery } from 'mongoose'

export interface CreateTaxiUnitDto {
  taxiNumber: string
  plateNumber: string
  brand: string
  model: string
  year: number
  color: string
  status?: TaxiUnitStatus
}

export interface UpdateTaxiUnitDto {
  taxiNumber?: string
  plateNumber?: string
  brand?: string
  model?: string
  year?: number
  color?: string
  status?: TaxiUnitStatus
}

export interface TaxiUnitFilters {
  status?: TaxiUnitStatus
  search?: string
}

export const taxiUnitRepository = {
  async findAll(filters: TaxiUnitFilters = {}, page = 1, limit = 10) {
    const query: FilterQuery<ITaxiUnit> = {}

    if (filters.status) query.status = filters.status
    if (filters.search) {
      query.$or = [
        { taxiNumber: { $regex: filters.search, $options: 'i' } },
        { plateNumber: { $regex: filters.search, $options: 'i' } },
        { brand: { $regex: filters.search, $options: 'i' } },
        { model: { $regex: filters.search, $options: 'i' } }
      ]
    }

    const skip = (page - 1) * limit
    const [data, total] = await Promise.all([
      TaxiUnit.find(query).skip(skip).limit(limit).sort({ taxiNumber: 1 }),
      TaxiUnit.countDocuments(query)
    ])

    return { data, total, page, limit, pages: Math.ceil(total / limit) }
  },

  async findById(id: string) {
    return TaxiUnit.findById(id)
  },

  async create(data: CreateTaxiUnitDto) {
    const unit = new TaxiUnit(data)
    return unit.save()
  },

  async update(id: string, data: UpdateTaxiUnitDto) {
    return TaxiUnit.findByIdAndUpdate(id, data, { new: true, runValidators: true })
  },

  async remove(id: string) {
    return TaxiUnit.findByIdAndDelete(id)
  },

  async count(filter: FilterQuery<ITaxiUnit> = {}) {
    return TaxiUnit.countDocuments(filter)
  },

  async findAvailable() {
    return TaxiUnit.find({ status: 'Available' }).select('_id taxiNumber plateNumber brand model')
  }
}
