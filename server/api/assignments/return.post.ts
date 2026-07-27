import { z } from 'zod'
import { assignmentService } from '../../services/assignmentService'

const returnSchema = z.object({
  assignmentId: z.string().min(1, 'Assignment ID is required'),
  remarks: z.string().optional().default('')
})

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  if (user.role !== 'dispatcher') {
    setResponseStatus(event, 403)
    return { success: false, message: 'Only dispatchers are authorized to manage taxi assignments.' }
  }
  await connectDB()

  const body = await readBody(event)
  const parsed = returnSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 422,
      message: parsed.error.errors[0]?.message || 'Validation failed'
    })
  }

  const result = await assignmentService.return({
    assignmentId: parsed.data.assignmentId,
    remarks: parsed.data.remarks
  })

  logAudit(
    event,
    user.userId,
    'RETURN_TAXI',
    'Taxi Assignment',
    `Taxi returned — Assignment ${parsed.data.assignmentId} | Hours worked: ${result.totalHours}h`
  )

  return successResponse(result, 'Taxi returned successfully')
})
