import { driverService, updateDriverSchema } from '~~/server/services/driverService'

export default defineEventHandler(async (event) => {
  const authUser = requireAuth(event)
  await connectDB()
  const id = getRouterParam(event, 'id')!

  const body = await readBody(event)
  const parsed = updateDriverSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: parsed.error.errors[0]?.message || 'Validation failed',
      data: parsed.error.flatten()
    })
  }

  const driver = await driverService.update(id, { ...parsed.data, updatedBy: authUser.userId })

  logAudit(event, authUser.userId, 'UPDATE_DRIVER', 'Drivers', `Updated driver: ${driver?.fullName}`)

  return successResponse(driver, 'Driver updated successfully')
})
