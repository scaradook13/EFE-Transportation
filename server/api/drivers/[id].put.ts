import { driverService } from '~~/server/services/driverService'
import { driverSchema } from '~~/shared/utils/validations'
import { handleZodError } from '~~/server/utils/response'

export default defineEventHandler(async (event) => {
  const authUser = requireAuth(event)
  await connectDB()
  const id = getRouterParam(event, 'id')!

  try {
    const body = await readBody(event)
    const parsed = await driverSchema.partial().parseAsync(body)
  
    const driver = await driverService.update(id, { ...parsed, updatedBy: authUser.userId })

  logAudit(event, authUser.userId, 'UPDATE_DRIVER', 'Drivers', `Updated driver: ${driver?.fullName}`)

    return successResponse(driver, 'Driver updated successfully')
  } catch (err) {
    handleZodError(err)
  }
})
