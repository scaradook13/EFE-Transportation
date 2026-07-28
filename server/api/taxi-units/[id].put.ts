import { taxiUnitService } from '~~/server/services/taxiUnitService'
import { taxiUnitRepository } from '~~/server/repositories/taxiUnitRepository'
import { taxiUnitSchema } from '~~/shared/utils/validations'
import { handleZodError } from '~~/server/utils/response'

export default defineEventHandler(async (event) => {
  const authUser = requireRole(event, 'admin')
  await connectDB()
  const id = getRouterParam(event, 'id')!

  try {
    const body = await readBody(event)
    const parsed = await taxiUnitSchema.partial().parseAsync(body)
  
    // Check uniqueness (ignoring self)
    const errors: Record<string, string> = {}
    if (parsed.taxiNumber) {
      const existingTaxiNumber = await taxiUnitRepository.findByTaxiNumber(parsed.taxiNumber)
      if (existingTaxiNumber && existingTaxiNumber._id.toString() !== id) errors.taxiNumber = 'Taxi number already exists.'
    }
    if (parsed.plateNumber) {
      const existingPlateNumber = await taxiUnitRepository.findByPlateNumber(parsed.plateNumber)
      if (existingPlateNumber && existingPlateNumber._id.toString() !== id) errors.plateNumber = 'Plate number already exists.'
    }
    if (Object.keys(errors).length > 0) {
      throw createError({ statusCode: 422, statusMessage: 'Unprocessable Entity', message: 'Validation failed', data: { errors } })
    }

    const unit = await taxiUnitService.update(id, parsed)

  logAudit(event, authUser.userId, 'UPDATE_TAXI_UNIT', 'Taxi Units', `Updated: ${unit?.taxiNumber}`)

    return successResponse(unit, 'Taxi unit updated successfully')
  } catch (err) {
    handleZodError(err)
  }
})
