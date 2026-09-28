import { taxiUnitService } from '~~/server/services/taxiUnitService'
import { DriverAssignment } from '~~/server/models/DriverAssignment'

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

  const assignmentCount = await DriverAssignment.countDocuments({ taxiUnit: id })
  if (assignmentCount > 0) {
    logAudit(event, authUser.userId, 'DELETE_TAXI_UNIT', 'Taxi Units', `Attempted Delete Taxi: Blocked - Taxi has ${assignmentCount} historical assignments`)
    setResponseStatus(event, 409)
    return {
      success: false,
      message: 'Cannot delete a taxi unit with existing dispatch and boundary history. To preserve audit and financial records, please set the taxi status to Maintenance or Retired instead.'
    }
  }

  await taxiUnitService.remove(id)

  logAudit(event, authUser.userId, 'DELETE_TAXI_UNIT', 'Taxi Units', `Deleted: ${(unit as { taxiNumber?: string })?.taxiNumber}`)

  return successResponse(null, 'Taxi unit deleted successfully')
})
