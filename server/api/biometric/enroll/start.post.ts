import { biometricBridge } from '../../../utils/biometricBridge'

export default defineEventHandler(async (event) => {
  requireAuth(event)

  const reader = await biometricBridge.getReaderStatus()
  if (!reader.connected) {
    throw createError({
      statusCode: 400,
      message: 'Fingerprint reader not detected. Please connect the DigitalPersona fingerprint reader and try again.'
    })
  }

  const result = await biometricBridge.startEnrollment()
  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: result.error || 'Failed to start fingerprint enrollment session.'
    })
  }

  return successResponse(result, 'Enrollment session initiated')
})
