import { driverService } from '~~/server/services/driverService'
import { assignmentRepository } from '~~/server/repositories/assignmentRepository'

export default defineEventHandler(async (event) => {
  const authUser = requireRole(event, 'admin', 'hr')
  await connectDB()
  const id = getRouterParam(event, 'id')!

  const activeAssignment = await assignmentRepository.findActiveByDriver(id)
  if (activeAssignment) {
    logAudit(event, authUser.userId, 'DELETE_DRIVER', 'Drivers', `Attempted Delete Driver: Blocked - Driver has an active assignment`)
    setResponseStatus(event, 409)
    return { success: false, message: 'This driver is currently on duty and cannot be deleted until the assigned taxi has been returned.' }
  }

  const driver = await driverService.remove(id)

  logAudit(event, authUser.userId, 'DELETE_DRIVER', 'Drivers', `Deleted driver: ${(driver as { fullName?: string })?.fullName}`)

  return successResponse(null, 'Driver deleted successfully')
})
