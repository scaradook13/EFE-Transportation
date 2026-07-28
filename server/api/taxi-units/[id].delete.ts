import { taxiUnitService } from '~~/server/services/taxiUnitService'

export default defineEventHandler(async (event) => {
  const authUser = requireRole(event, 'admin')
  await connectDB()
  const id = getRouterParam(event, 'id')!

  const unit = await taxiUnitService.getById(id)
  
  if (unit.status === 'In Use') {
    logAudit(event, authUser.userId, 'DELETE_TAXI_UNIT', 'Taxi Units', `Attempted Delete Taxi: Blocked - Taxi is currently in use`)
    setResponseStatus(event, 409)
    return { success: false, message: 'This taxi is currently in use and cannot be deleted until it has been returned.' }
  }

  await taxiUnitService.remove(id)

  logAudit(event, authUser.userId, 'DELETE_TAXI_UNIT', 'Taxi Units', `Deleted: ${(unit as { taxiNumber?: string })?.taxiNumber}`)

  return successResponse(null, 'Taxi unit deleted successfully')
})
