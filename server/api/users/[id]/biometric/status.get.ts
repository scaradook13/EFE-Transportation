import { User } from '../../../../models/User'
import { biometricBridge } from '../../../../utils/biometricBridge'

export default defineEventHandler(async (event) => {
  const authUser = requireAuth(event)
  const targetUserId = getRouterParam(event, 'id')!
  await connectDB()

  // Authorized if user is querying their own profile, or if Admin
  if (authUser.userId !== targetUserId && authUser.role !== 'admin') {
    throw createError({ statusCode: 403, message: 'You are not authorized to view this user\'s biometric status.' })
  }

  const user = await User.findById(targetUserId)
  if (!user) {
    throw createError({ statusCode: 404, message: 'User not found' })
  }

  const reader = await biometricBridge.getReaderStatus()

  return successResponse({
    enrolled: !!user.biometric?.enrolled,
    finger: user.biometric?.finger || 'Right Index',
    enrolledAt: user.biometric?.enrolledAt ? user.biometric.enrolledAt.toISOString() : null,
    readerConnected: reader.connected,
    readerName: reader.description || 'DigitalPersona 4500'
  }, 'Biometric status retrieved')
})
