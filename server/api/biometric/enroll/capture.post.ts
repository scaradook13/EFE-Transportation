import { biometricBridge } from '../../../utils/biometricBridge'

export default defineEventHandler(async (event) => {
  requireAuth(event)

  try {
    const result = await biometricBridge.captureEnrollSample()
    if (!result.success) {
      if (result.status === 'timeout') {
        throw createError({ statusCode: 408, message: 'Fingerprint capture timed out. Please try again.' })
      }
      if (result.status === 'cancelled') {
        throw createError({ statusCode: 400, message: 'Capture cancelled.' })
      }
      throw createError({
        statusCode: 400,
        message: result.error || 'Fingerprint capture failed. Please place your finger correctly on the reader.'
      })
    }
    return successResponse(result, 'Sample processed')
  } catch (err: any) {
    if (err.statusCode) throw err
    throw createError({
      statusCode: 500,
      message: err.message || 'Error communicating with biometric service.'
    })
  }
})
