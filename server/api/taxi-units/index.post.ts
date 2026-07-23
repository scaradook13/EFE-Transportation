import { taxiUnitService, createTaxiUnitSchema } from '../../services/taxiUnitService'

export default defineEventHandler(async (event) => {
  const authUser = requireRole(event, 'admin')
  await connectDB()

  const body = await readBody(event)
  const parsed = createTaxiUnitSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: parsed.error.errors[0]?.message || 'Validation failed',
      data: parsed.error.flatten()
    })
  }

  const unit = await taxiUnitService.create(parsed.data)

  logAudit(event, authUser.userId, 'CREATE_TAXI_UNIT', 'Taxi Units', `Created taxi unit: ${unit.taxiNumber} (${unit.plateNumber})`)

  return successResponse(unit, 'Taxi unit created successfully', 201)
})
