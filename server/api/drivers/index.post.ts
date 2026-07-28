import { driverService } from '../../services/driverService'
import { driverSchema } from '~~/shared/utils/validations'
import { handleZodError } from '~~/server/utils/response'

export default defineEventHandler(async (event) => {
  const authUser = requireAuth(event)
  await connectDB()

  try {
    const body = await readBody(event)
    const parsed = await driverSchema.parseAsync(body)
  
    const driver = await driverService.create({
      ...parsed,
    createdBy: authUser.userId
  })

  logAudit(event, authUser.userId, 'CREATE_DRIVER', 'Drivers', `Created driver: ${driver.fullName} (${driver.driverId})`)

    return successResponse(driver, 'Driver created successfully', 201)
  } catch (err) {
    handleZodError(err)
  }
})
