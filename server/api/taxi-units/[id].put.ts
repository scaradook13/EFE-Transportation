import { taxiUnitService, updateTaxiUnitSchema } from '~~/server/services/taxiUnitService'

export default defineEventHandler(async (event) => {
  const authUser = requireRole(event, 'admin')
  await connectDB()
  const id = getRouterParam(event, 'id')!

  const body = await readBody(event)
  const parsed = updateTaxiUnitSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: parsed.error.errors[0]?.message || 'Validation failed'
    })
  }

  const unit = await taxiUnitService.update(id, parsed.data)

  logAudit(event, authUser.userId, 'UPDATE_TAXI_UNIT', 'Taxi Units', `Updated: ${unit?.taxiNumber}`)

  return successResponse(unit, 'Taxi unit updated successfully')
})
