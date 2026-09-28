import { assignmentService } from '../../services/assignmentService'

export default defineEventHandler(async (event) => {
  requireRole(event, 'admin', 'dispatcher', 'hr')
  await connectDB()
  const stats = await assignmentService.getStats()
  return successResponse(stats, 'Dashboard data retrieved')
})
