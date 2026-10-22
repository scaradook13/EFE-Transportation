import { taxiUnitService } from '~~/server/services/taxiUnitService'
import { taxiUnitRepository } from '~~/server/repositories/taxiUnitRepository'

/**
 * Archive a taxi unit — Admin only.
 * The unit is hidden from the Taxi Fleet list and moved to the Archives tab.
 */
export default defineEventHandler(async (event) => {
  const authUser = requireRole(event, 'admin')
  await connectDB()
  const id = getRouterParam(event, 'id')!

  const unit = await taxiUnitService.getById(id)

  if ((unit as { isArchived?: boolean }).isArchived) {
    setResponseStatus(event, 409)
    return { success: false, message: 'This taxi unit is already archived.' }
  }

  if (unit.status === 'In Use') {
    logAudit(event, authUser.userId, 'ARCHIVE_TAXI_BLOCKED', 'Taxi Units', `Attempted to archive taxi ${unit.taxiNumber}: taxi is currently in use`)
    setResponseStatus(event, 409)
    return { success: false, message: 'This taxi is currently in use and cannot be archived until it has been returned.' }
  }

  await taxiUnitRepository.archive(id, authUser.userId)

  logAudit(event, authUser.userId, 'ARCHIVE_TAXI', 'Taxi Units', `Archived taxi: ${unit.taxiNumber} (${unit.plateNumber})`)

  return successResponse(null, 'Taxi unit archived successfully')
})
