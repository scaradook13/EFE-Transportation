import { taxiUnitService } from '../../services/taxiUnitService'
import { taxiUnitRepository } from '../../repositories/taxiUnitRepository'
import { taxiUnitSchema } from '~~/shared/utils/validations'
import { handleZodError } from '~~/server/utils/response'

export default defineEventHandler(async (event) => {
  const authUser = requireRole(event, 'admin')
  await connectDB()

  try {
    const body = await readBody(event)
    const parsed = await taxiUnitSchema.parseAsync(body)
    
    // Check uniqueness
    const errors: Record<string, string> = {}
    const existingTaxiNumber = await taxiUnitRepository.findByTaxiNumber(parsed.taxiNumber)
    if (existingTaxiNumber) errors.taxiNumber = 'Taxi number already exists.'

    const existingPlateNumber = await taxiUnitRepository.findByPlateNumber(parsed.plateNumber)
    if (existingPlateNumber) errors.plateNumber = 'Plate number already exists.'

    if (Object.keys(errors).length > 0) {
      throw createError({ statusCode: 422, statusMessage: 'Unprocessable Entity', message: 'Validation failed', data: { errors } })
    }


    const unit = await taxiUnitService.create(parsed)
  
    logAudit(event, authUser.userId, 'CREATE_TAXI_UNIT', 'Taxi Units', `Created taxi unit: ${unit.taxiNumber} (${unit.plateNumber})`)
  
    return successResponse(unit, 'Taxi unit created successfully', 201)
  } catch (err) {
    handleZodError(err)
  }
})
