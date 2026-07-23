import { dispatchRepository, type CreateDispatchDto, type UpdateDispatchDto, type DispatchFilters } from '~~/server/repositories/dispatchRepository'
import { taxiUnitRepository } from '~~/server/repositories/taxiUnitRepository'
import { z } from 'zod'

export const createDispatchSchema = z.object({
  driver: z.string().min(1, 'Driver is required'),
  taxiUnit: z.string().min(1, 'Taxi unit is required'),
  passengerName: z.string().min(1, 'Passenger name is required').max(100),
  pickupLocation: z.string().min(1, 'Pickup location is required'),
  destination: z.string().min(1, 'Destination is required'),
  departureTime: z.string().or(z.date()),
  remarks: z.string().optional()
})

export const updateDispatchSchema = z.object({
  status: z.enum(['Active', 'Completed', 'Cancelled']).optional(),
  arrivalTime: z.string().or(z.date()).optional(),
  remarks: z.string().optional()
})

export const dispatchService = {
  async getAll(filters: DispatchFilters, page: number, limit: number) {
    await connectDB()
    return dispatchRepository.findAll(filters, page, limit)
  },

  async getById(id: string) {
    await connectDB()
    const dispatch = await dispatchRepository.findById(id)
    if (!dispatch) {
      throw createError({ statusCode: 404, message: 'Dispatch not found' })
    }
    return dispatch
  },

  async create(data: CreateDispatchDto, dispatcherId: string) {
    await connectDB()

    // Verify taxi unit is available
    const taxiUnit = await taxiUnitRepository.findById(data.taxiUnit)
    if (!taxiUnit) {
      throw createError({ statusCode: 404, message: 'Taxi unit not found' })
    }
    if (taxiUnit.status !== 'Available') {
      throw createError({ statusCode: 400, message: `Taxi unit is currently ${taxiUnit.status}` })
    }

    const dispatch = await dispatchRepository.create({ ...data, dispatcher: dispatcherId })

    // Update taxi unit status to On Trip
    await taxiUnitRepository.update(data.taxiUnit, { status: 'On Trip' })

    return dispatch
  },

  async update(id: string, data: UpdateDispatchDto) {
    await connectDB()

    const existing = await dispatchRepository.findById(id)
    if (!existing) {
      throw createError({ statusCode: 404, message: 'Dispatch not found' })
    }

    // If completing, set arrival time and release taxi
    if (data.status === 'Completed' && !data.arrivalTime) {
      data.arrivalTime = new Date().toISOString()
    }

    const updated = await dispatchRepository.update(id, data)

    // If completing or cancelling, make taxi unit available again
    if (data.status === 'Completed' || data.status === 'Cancelled') {
      const taxiUnitId = (existing.taxiUnit as unknown as { _id: string })._id?.toString()
        || existing.taxiUnit.toString()
      await taxiUnitRepository.update(taxiUnitId, { status: 'Available' })
    }

    return updated
  },

  async getRecentDispatches(limit = 5) {
    await connectDB()
    return dispatchRepository.getRecentDispatches(limit)
  }
}
