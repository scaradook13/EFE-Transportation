import { User } from '../../../../models/User'
import { biometricBridge } from '../../../../utils/biometricBridge'

export default defineEventHandler(async (event) => {
  const authUser = requireAuth(event)
  const targetUserId = getRouterParam(event, 'id')!
  await connectDB()

  // Permission check: users can remove their own biometrics; admins can remove any user's
  if (authUser.userId !== targetUserId && authUser.role !== 'admin') {
    throw createError({ statusCode: 403, message: 'You are not authorized to remove biometric data for this user.' })
  }

  const user = await User.findById(targetUserId).select('+biometric.template')
  if (!user) {
    throw createError({ statusCode: 404, message: 'User not found' })
  }

  if (!user.biometric?.enrolled) {
    throw createError({ statusCode: 400, message: 'User does not have an enrolled fingerprint.' })
  }

  const oldTemplate = user.biometric.template
  if (oldTemplate) {
    await biometricBridge.deleteTemplate(oldTemplate)
  }

  user.biometric = {
    enrolled: false,
    template: null,
    finger: 'Right Index',
    enrolledAt: null
  }

  await user.save()

  logAudit(
    event,
    authUser.userId,
    'BIOMETRIC_REMOVED',
    'Users',
    `Removed registered fingerprint for user: ${user.fullName} (${user.username})`
  )

  return successResponse({
    userId: user._id.toString(),
    biometric: {
      enrolled: false,
      finger: 'Right Index',
      enrolledAt: null
    }
  }, 'Biometric credential removed successfully')
})
