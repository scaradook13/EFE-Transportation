import { driverService } from '~~/server/services/driverService'

export default defineEventHandler(async (event) => {
  const authUser = requireRole(event, 'admin', 'hr')
  await connectDB()
  const id = getRouterParam(event, 'id')!

  const driver = await driverService.remove(id)

  logAudit(event, authUser.userId, 'DELETE_DRIVER', 'Drivers', `Deleted driver: ${(driver as { fullName?: string })?.fullName}`)

  return successResponse(null, 'Driver deleted successfully')
})
