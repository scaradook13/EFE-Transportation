import { assignmentService } from '../../services/assignmentService'
import { assignmentReturnSchema } from '~~/shared/utils/validations'
import { handleZodError } from '~~/server/utils/response'
import { assignmentRepository } from '../../repositories/assignmentRepository'
import { z } from 'zod'
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
    // The shared schema doesn't have assignmentId (it's internal to the frontend), so we merge it
    const parsed = await assignmentReturnSchema.extend({
      assignmentId: z.string().min(1)
    }).parseAsync(body)

    // 1. Verify Assignment exists and is Active
    const assignment = await assignmentRepository.findById(parsed.assignmentId)
    if (!assignment) {
      throw createError({ statusCode: 404, message: 'Assignment not found.' })
    }
    if (assignment.status !== 'Active') {
      throw createError({ statusCode: 409, message: 'Assignment is already completed.' })
    }

    // 2. Driver Biometric Authentication Verification
    // The assigned DRIVER must scan their fingerprint to confirm the return
    const driverBiometricToken = body.biometricToken
    if (!driverBiometricToken) {
      throw createError({
        statusCode: 403,
        message: 'Driver biometric authentication is required before taxi can be returned.'
      })
    }

    const assignedDriverId = ((assignment.driver as any)?._id || assignment.driver).toString()

    let driverPayload: any
    try {
      const config = useRuntimeConfig()
      driverPayload = jwt.verify(driverBiometricToken, config.jwtSecret) as any
      if (driverPayload.type !== 'driver_biometric_auth' || driverPayload.userId !== assignedDriverId) {
        throw new Error('Invalid token')
      }
    } catch {
      throw createError({
        statusCode: 403,
        message: 'Driver fingerprint authentication failed or expired. Taxi cannot be returned.'
      })
    }
  
    const result = await assignmentService.return({
      assignmentId: parsed.assignmentId,
      remarks: parsed.remarks
    })

    logAudit(
      event,
      user.userId,
      'RETURN_TAXI',
      'Taxi Assignment',
      `Taxi returned — Assignment ${parsed.assignmentId} | Driver ${driverPayload.fullName || assignedDriverId} biometrically verified | Hours worked: ${result.totalHours}h`
    )

    return successResponse(result, 'Taxi returned successfully')
  } catch (err) {
    handleZodError(err)
  }
})
