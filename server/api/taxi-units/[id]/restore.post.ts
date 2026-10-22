import { taxiUnitService } from '~~/server/services/taxiUnitService'
import { taxiUnitRepository } from '~~/server/repositories/taxiUnitRepository'

/**
 * Restore (unarchive) a taxi unit — Admin only.
 * The unit reappears on the Taxi Fleet list.
 */
export default defineEventHandler(async (event) => {
  const authUser = requireRole(event, 'admin')
  await connectDB()
  const id = getRouterParam(event, 'id')!

  const unit = await taxiUnitService.getById(id)

  if (!(unit as { isArchived?: boolean }).isArchived) {
    setResponseStatus(event, 409)
    return { success: false, message: 'This taxi unit is not archived.' }
  }

  await taxiUnitRepository.restore(id)

  logAudit(event, authUser.userId, 'RESTORE_TAXI', 'Archives', `Restored taxi: ${unit.taxiNumber} (${unit.plateNumber})`)

  return successResponse(null, 'Taxi unit restored successfully')
})
