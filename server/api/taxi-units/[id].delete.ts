import { taxiUnitService } from '~~/server/services/taxiUnitService'
import { DriverAssignment } from '~~/server/models/DriverAssignment'

/**
 * Permanently delete a taxi unit — Admin only, from the Archives tab.
 * The unit must be archived first. Past assignment records are kept;
 * they will simply no longer link to a taxi profile.
 */
export default defineEventHandler(async (event) => {
  const authUser = requireRole(event, 'admin')
  await connectDB()
  const id = getRouterParam(event, 'id')!

  const unit = await taxiUnitService.getById(id)

  if (!(unit as { isArchived?: boolean }).isArchived) {
    setResponseStatus(event, 409)
    return { success: false, message: 'Only archived taxi units can be permanently deleted. Archive the taxi first.' }
  }

  const activeAssignment = await DriverAssignment.exists({ taxiUnit: id, status: 'Active' })
  if (unit.status === 'In Use' || activeAssignment) {
    logAudit(event, authUser.userId, 'PERMANENT_DELETE_TAXI_BLOCKED', 'Archives', `Attempted to delete taxi ${unit.taxiNumber}: taxi is currently in use`)
    setResponseStatus(event, 409)
    return { success: false, message: 'This taxi is currently in use and cannot be deleted until it has been returned.' }
  }

  await taxiUnitService.remove(id)

  logAudit(event, authUser.userId, 'PERMANENT_DELETE_TAXI', 'Archives', `Permanently deleted taxi: ${unit.taxiNumber} (${unit.plateNumber})`)

  return successResponse(null, 'Taxi unit permanently deleted')
})
