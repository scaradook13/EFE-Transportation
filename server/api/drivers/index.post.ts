import { driverService, createDriverSchema } from '../../services/driverService'

export default defineEventHandler(async (event) => {
  const authUser = requireAuth(event)
  await connectDB()

  const body = await readBody(event)
  const parsed = createDriverSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: parsed.error.errors[0]?.message || 'Validation failed',
      data: parsed.error.flatten()
    })
  }

  const driver = await driverService.create({
    ...parsed.data,
    createdBy: authUser.userId
  })

  logAudit(event, authUser.userId, 'CREATE_DRIVER', 'Drivers', `Created driver: ${driver.fullName} (${driver.driverId})`)

  return successResponse(driver, 'Driver created successfully', 201)
})
