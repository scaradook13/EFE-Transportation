import { assignmentService } from '../../services/assignmentService'

export default defineEventHandler(async (event) => {
  requireAuth(event)
  await connectDB()
  const stats = await assignmentService.getStats()
  return successResponse(stats, 'Dashboard data retrieved')
})
