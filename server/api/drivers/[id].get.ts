import { driverService } from '~~/server/services/driverService'

export default defineEventHandler(async (event) => {
  requireAuth(event)
  await connectDB()
  const id = getRouterParam(event, 'id')!
  const driver = await driverService.getById(id)
  return successResponse(driver)
})
