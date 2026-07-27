import { z } from 'zod'
import { assignmentService } from '../../services/assignmentService'

const issueSchema = z.object({
  driverId: z.string().min(1, 'Driver is required'),
  taxiUnitId: z.string().min(1, 'Taxi unit is required'),
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
  const parsed = issueSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 422,
      message: parsed.error.errors[0]?.message || 'Validation failed'
    })
  }

  const assignment = await assignmentService.issue({
    driverId: parsed.data.driverId,
    taxiUnitId: parsed.data.taxiUnitId,
    issuedBy: user.userId,
    remarks: parsed.data.remarks
  })

  logAudit(
    event,
    user.userId,
    'ISSUE_TAXI',
    'Taxi Assignment',
    `Issued taxi to driver — Assignment ${assignment.assignmentNumber}`
  )

  return successResponse(assignment, 'Taxi issued successfully')
})
