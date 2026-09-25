
import { User } from '../../models/User'

export default defineEventHandler(async (event) => {
  const authUser = requireAuth(event)
  await connectDB()

  const dbUser = await User.findById(authUser.userId)
  if (!dbUser || !dbUser.isActive) {
    throw createError({ statusCode: 401, message: 'User not found or deactivated' })
  }

  // Update lastActivity
  dbUser.lastActivity = new Date()
  await dbUser.save()

  return successResponse({
    user: {
      userId: dbUser._id.toString(),
      username: dbUser.username,
      fullName: dbUser.fullName,
      email: dbUser.email || '',
      role: dbUser.role,
      isActive: dbUser.isActive,
      isPrimaryAdmin: dbUser.isPrimaryAdmin || false,
      biometric: {
        enrolled: dbUser.biometric?.enrolled || false,
        finger: dbUser.biometric?.finger || 'Right Index',
        enrolledAt: dbUser.biometric?.enrolledAt ? dbUser.biometric.enrolledAt.toISOString() : null
      }
    }
  }, 'Authenticated')
})
