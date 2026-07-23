import { Dispatch, type IDispatch, type DispatchStatus } from '~~/server/models/Dispatch'
import type { FilterQuery } from 'mongoose'

export interface CreateDispatchDto {
  driver: string
  taxiUnit: string
  passengerName: string
  pickupLocation: string
  destination: string
  dispatcher: string
  departureTime: Date | string
  remarks?: string
}

export interface UpdateDispatchDto {
  status?: DispatchStatus
  arrivalTime?: Date | string
  remarks?: string
}

export interface DispatchFilters {
  status?: DispatchStatus
  dispatcher?: string
  driver?: string
  dateFrom?: string
  dateTo?: string
  search?: string
}

export const dispatchRepository = {
  async findAll(filters: DispatchFilters = {}, page = 1, limit = 10) {
    const query: FilterQuery<IDispatch> = {}

    if (filters.status) query.status = filters.status
    if (filters.dispatcher) query.dispatcher = filters.dispatcher
    if (filters.driver) query.driver = filters.driver
    if (filters.dateFrom || filters.dateTo) {
      query.departureTime = {}
      if (filters.dateFrom) query.departureTime.$gte = new Date(filters.dateFrom)
      if (filters.dateTo) query.departureTime.$lte = new Date(filters.dateTo)
    }
    if (filters.search) {
      query.$or = [
        { dispatchNumber: { $regex: filters.search, $options: 'i' } },
        { passengerName: { $regex: filters.search, $options: 'i' } },
        { pickupLocation: { $regex: filters.search, $options: 'i' } },
        { destination: { $regex: filters.search, $options: 'i' } }
      ]
    }

    const skip = (page - 1) * limit
    const [data, total] = await Promise.all([
      Dispatch.find(query)
        .populate('driver', 'fullName driverId')
        .populate('taxiUnit', 'taxiNumber plateNumber brand model')
        .populate('dispatcher', 'fullName username')
        .skip(skip)
        .limit(limit)
        .sort({ departureTime: -1 }),
      Dispatch.countDocuments(query)
    ])

    return { data, total, page, limit, pages: Math.ceil(total / limit) }
  },

  async findById(id: string) {
    return Dispatch.findById(id)
      .populate('driver', 'fullName driverId contactNumber')
      .populate('taxiUnit', 'taxiNumber plateNumber brand model color')
      .populate('dispatcher', 'fullName username')
  },

  async create(data: CreateDispatchDto) {
    const dispatch = new Dispatch(data)
    return dispatch.save()
  },

  async update(id: string, data: UpdateDispatchDto) {
    return Dispatch.findByIdAndUpdate(id, data, { new: true, runValidators: true })
      .populate('driver', 'fullName driverId')
      .populate('taxiUnit', 'taxiNumber plateNumber')
      .populate('dispatcher', 'fullName username')
  },

  async count(filter: FilterQuery<IDispatch> = {}) {
    return Dispatch.countDocuments(filter)
  },

  async getRecentDispatches(limit = 5) {
    return Dispatch.find()
      .populate('driver', 'fullName driverId')
      .populate('taxiUnit', 'taxiNumber plateNumber')
      .populate('dispatcher', 'fullName')
      .sort({ createdAt: -1 })
      .limit(limit)
  },

  async getDispatchesByDateRange(from: Date, to: Date) {
    return Dispatch.find({
      departureTime: { $gte: from, $lte: to }
    }).sort({ departureTime: 1 })
  }
}
