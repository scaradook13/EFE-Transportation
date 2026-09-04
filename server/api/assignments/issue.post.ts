import { assignmentService } from '../../services/assignmentService'
import { assignmentIssueSchema } from '~~/shared/utils/validations'
import { handleZodError } from '~~/server/utils/response'
import { Driver } from '~~/server/models/Driver'
import jwt from 'jsonwebtoken'

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
    
    // Fingerprint verification enforcement
    const driver = await Driver.findById(parsed.driverId)
    if (!driver) throw createError({ statusCode: 404, message: 'Driver not found' })
    if (!driver.fingerprint || !driver.fingerprint.registered) {
      throw createError({ statusCode: 403, message: 'This driver does not have a registered fingerprint. Fingerprint registration is required before dispatch.' })
    }
    
    if (!body.biometricToken) {
      throw createError({ statusCode: 403, message: 'Biometric verification is required for dispatch.' })
    }
    
    try {
      const config = useRuntimeConfig()
      const payload = jwt.verify(body.biometricToken, config.jwtSecret) as any
      if (payload.type !== 'fingerprint_auth' || payload.driverId !== driver._id.toString()) {
        throw new Error('Invalid biometric token')
      }
    } catch {
      throw createError({ statusCode: 403, message: 'Invalid or expired biometric token. Please verify fingerprint again.' })
    }

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
