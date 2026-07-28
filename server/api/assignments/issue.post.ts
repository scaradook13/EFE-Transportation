import { assignmentService } from '../../services/assignmentService'
import { assignmentIssueSchema } from '~~/shared/utils/validations'
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
    const parsed = await assignmentIssueSchema.parseAsync(body)
  
    const assignment = await assignmentService.issue({
      driverId: parsed.driverId,
      taxiUnitId: parsed.taxiUnitId,
      issuedBy: user.userId,
      remarks: parsed.remarks
    })

  logAudit(
    event,
    user.userId,
    'ISSUE_TAXI',
    'Taxi Assignment',
    `Issued taxi to driver — Assignment ${assignment.assignmentNumber}`
  )

    return successResponse(assignment, 'Taxi issued successfully')
  } catch (err) {
    // If the service threw an error (e.g. driver already on duty), format it to match frontend schema
    if (err && typeof err === 'object' && 'statusCode' in err && (err as any).statusCode === 400) {
      throw createError({ statusCode: 422, statusMessage: 'Unprocessable Entity', message: 'Validation failed', data: { errors: { global: (err as any).message } } })
    }
    handleZodError(err)
  }
})
