import { driverService } from '~~/server/services/driverService'
import { driverRepository } from '~~/server/repositories/driverRepository'
import { assignmentRepository } from '~~/server/repositories/assignmentRepository'

/**
 * Archive a driver profile (Admin + HR).
 * The driver is hidden from all active lists and moved to the Admin Archives tab.
 */
export default defineEventHandler(async (event) => {
  const authUser = requireRole(event, 'admin', 'hr')
  await connectDB()
  const id = getRouterParam(event, 'id')!

  const driver = await driverService.getById(id)

  if ((driver as { isArchived?: boolean }).isArchived) {
    setResponseStatus(event, 409)
    return { success: false, message: 'This driver is already archived.' }
  }

  const activeAssignment = await assignmentRepository.findActiveByDriver(id)
  if (activeAssignment || driver.operationalStatus === 'Active') {
    logAudit(event, authUser.userId, 'ARCHIVE_DRIVER_BLOCKED', 'Drivers', `Attempted to archive ${driver.fullName}: driver is currently on duty`)
    setResponseStatus(event, 409)
    return { success: false, message: 'This driver is currently on duty and cannot be archived until the assigned taxi has been returned.' }
  }

  await driverRepository.archive(id, authUser.userId)

  logAudit(event, authUser.userId, 'ARCHIVE_DRIVER', 'Drivers', `Archived driver: ${driver.fullName} (${driver.driverId})`)

  return successResponse(null, 'Driver archived successfully')
})
