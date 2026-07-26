import { assignmentRepository } from '../../repositories/assignmentRepository'

export default defineEventHandler(async (event) => {
  requireAuth(event)
  await connectDB()

  const assignments = await assignmentRepository.findActive()
  return successResponse(assignments, 'Active assignments retrieved')
})
