import { assignmentService } from '../../services/assignmentService'
import { assignmentIssueSchema } from '~~/shared/utils/validations'
import { handleZodError } from '~~/server/utils/response'
import { Driver } from '~~/server/models/Driver'
import jwt from 'jsonwebtoken'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  if (!['dispatcher', 'admin'].includes(user.role)) {
    setResponseStatus(event, 403)
    return { success: false, message: 'Only dispatchers and administrators are authorized to manage taxi assignments.' }
  }
  await connectDB()

  try {
    const body = await readBody(event)
    const parsed = await assignmentIssueSchema.parseAsync(body)
    
    // 1. Driver Biometric Authentication Verification
    // The DRIVER must scan their fingerprint to confirm the dispatch
    const driverBiometricToken = body.biometricToken
    if (!driverBiometricToken) {
      throw createError({
        statusCode: 403,
        message: 'Driver biometric authentication is required before dispatch can continue.'
      })
    }

    try {
      const config = useRuntimeConfig()
      const payload = jwt.verify(driverBiometricToken, config.jwtSecret) as any
      if (payload.type !== 'driver_biometric_auth' || payload.userId !== parsed.driverId) {
        throw new Error('Invalid token')
      }
    } catch {
      throw createError({
        statusCode: 403,
        message: 'Driver fingerprint authentication failed or expired. Dispatch cannot continue.'
      })
    }

    // 2. Driver Verification
    const driver = await Driver.findById(parsed.driverId)
    if (!driver) throw createError({ statusCode: 404, message: 'Driver not found' })

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
