import { assignmentService } from '../../services/assignmentService'
import { assignmentReturnSchema } from '~~/shared/utils/validations'
import { handleZodError } from '~~/server/utils/response'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  if (user.role !== 'dispatcher') {
    setResponseStatus(event, 403)
    return { success: false, message: 'Only dispatchers are authorized to manage taxi assignments.' }
  }
  await connectDB()

  try {
    const body = await readBody(event)
    // The shared schema doesn't have assignmentId (it's internal to the frontend), so we merge it
    const parsed = await assignmentReturnSchema.extend({ assignmentId: z.string().min(1) }).parseAsync(body)
  
    const result = await assignmentService.return({
      assignmentId: parsed.assignmentId,
      remarks: parsed.remarks
    })

  logAudit(
    event,
    user.userId,
    'RETURN_TAXI',
    'Taxi Assignment',
    `Taxi returned — Assignment ${parsed.data.assignmentId} | Hours worked: ${result.totalHours}h`
  )

    return successResponse(result, 'Taxi returned successfully')
  } catch (err) {
    handleZodError(err)
  }
})
