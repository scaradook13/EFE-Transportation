import { driverService } from '~~/server/services/driverService'
import { assignmentRepository } from '~~/server/repositories/assignmentRepository'

/**
 * Permanently delete a driver — Admin only, from the Archives tab.
 * The driver must be archived first. Past assignment/boundary records are kept;
 * they will simply no longer link to a driver profile.
 */
export default defineEventHandler(async (event) => {
  const authUser = requireRole(event, 'admin')
  await connectDB()
  const id = getRouterParam(event, 'id')!

  const existing = await driverService.getById(id)

  if (!(existing as { isArchived?: boolean }).isArchived) {
    setResponseStatus(event, 409)
    return { success: false, message: 'Only archived drivers can be permanently deleted. Archive the driver first.' }
  }

  const activeAssignment = await assignmentRepository.findActiveByDriver(id)
  if (activeAssignment) {
    logAudit(event, authUser.userId, 'PERMANENT_DELETE_DRIVER_BLOCKED', 'Archives', `Attempted to delete ${existing.fullName}: driver has an active assignment`)
    setResponseStatus(event, 409)
    return { success: false, message: 'This driver still has an active assignment and cannot be deleted until the taxi has been returned.' }
  }

  const driver = await driverService.remove(id)

  logAudit(event, authUser.userId, 'PERMANENT_DELETE_DRIVER', 'Archives', `Permanently deleted driver: ${(driver as { fullName?: string })?.fullName} (${existing.driverId})`)

  return successResponse(null, 'Driver permanently deleted')
})
