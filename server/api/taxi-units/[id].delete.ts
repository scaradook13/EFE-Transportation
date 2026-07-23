import { taxiUnitService } from '~~/server/services/taxiUnitService'

export default defineEventHandler(async (event) => {
  const authUser = requireRole(event, 'admin')
  await connectDB()
  const id = getRouterParam(event, 'id')!

  const unit = await taxiUnitService.remove(id)

  logAudit(event, authUser.userId, 'DELETE_TAXI_UNIT', 'Taxi Units', `Deleted: ${(unit as { taxiNumber?: string })?.taxiNumber}`)

  return successResponse(null, 'Taxi unit deleted successfully')
})
