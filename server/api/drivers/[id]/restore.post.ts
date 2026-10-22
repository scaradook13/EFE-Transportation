import { driverService } from '~~/server/services/driverService'
import { driverRepository } from '~~/server/repositories/driverRepository'

/**
 * Restore (unarchive) a driver profile — Admin only.
 * The driver reappears on the active Drivers list.
 */
export default defineEventHandler(async (event) => {
  const authUser = requireRole(event, 'admin')
  await connectDB()
  const id = getRouterParam(event, 'id')!

  const driver = await driverService.getById(id)

  if (!(driver as { isArchived?: boolean }).isArchived) {
    setResponseStatus(event, 409)
    return { success: false, message: 'This driver is not archived.' }
  }

  await driverRepository.restore(id)

  logAudit(event, authUser.userId, 'RESTORE_DRIVER', 'Archives', `Restored driver: ${driver.fullName} (${driver.driverId})`)

  return successResponse(null, 'Driver restored successfully')
})
