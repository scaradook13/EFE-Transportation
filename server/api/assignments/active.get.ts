import { assignmentRepository } from '../../repositories/assignmentRepository'

export default defineEventHandler(async (event) => {
  requireRole(event, 'admin', 'dispatcher', 'hr')
  await connectDB()

  const assignments = await assignmentRepository.findActive()
  return successResponse(assignments, 'Active assignments retrieved')
})
