import { dashboardService } from '../../services/dashboardService'

export default defineEventHandler(async (event) => {
  requireAuth(event)
  await connectDB()
  const stats = await dashboardService.getStats()
  return successResponse(stats, 'Dashboard data retrieved')
})
