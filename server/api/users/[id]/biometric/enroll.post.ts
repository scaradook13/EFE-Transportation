import { User } from '../../../../models/User'
import { z } from 'zod'
import { handleZodError } from '../../../../utils/response'
import { assertFingerprintIsUnique } from '../../../../utils/biometricDeduplication'

const enrollSchema = z.object({
  template: z.string().min(1, 'Biometric template is required.'),
  templateId: z.string().optional(),
  finger: z.string().optional().default('Right Index')
})

export default defineEventHandler(async (event) => {
  const authUser = requireAuth(event)
  const targetUserId = getRouterParam(event, 'id')!
  await connectDB()

  // Permission check: users can enroll their own biometrics; admins can enroll any user
  if (authUser.userId !== targetUserId && authUser.role !== 'admin') {
    throw createError({ statusCode: 403, message: 'You are not authorized to enroll biometric data for this user.' })
  }

  try {
    const body = await readBody(event)
    const parsed = await enrollSchema.parseAsync(body)

    const user = await User.findById(targetUserId)
    if (!user) {
      throw createError({ statusCode: 404, message: 'User not found' })
    }

    const templateToEnroll = (parsed.template || parsed.templateId)!

    // Enforce Rule: Only one fingerprint copy is allowed across the entire system
    await assertFingerprintIsUnique(templateToEnroll, targetUserId, 'user')

    const wasEnrolled = !!user.biometric?.enrolled
    const oldTemplate = user.biometric?.template

    user.biometric = {
      enrolled: true,
      template: templateToEnroll,
      finger: parsed.finger || 'Right Index',
      enrolledAt: new Date()
    }

    await user.save()

    const action = wasEnrolled ? 'BIOMETRIC_RE_ENROLLED' : 'BIOMETRIC_ENROLLED'
    logAudit(
      event,
      authUser.userId,
      action,
      'Users',
      `${action === 'BIOMETRIC_RE_ENROLLED' ? 'Re-registered' : 'Enrolled'} fingerprint (${user.biometric.finger}) for user: ${user.fullName} (${user.username})`
    )

    return successResponse({
      userId: user._id.toString(),
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      biometric: {
        enrolled: user.biometric.enrolled,
        finger: user.biometric.finger,
        enrolledAt: user.biometric.enrolledAt.toISOString()
      }
    }, wasEnrolled ? 'Fingerprint re-registered successfully' : 'Fingerprint registered successfully')
  } catch (err) {
    handleZodError(err)
  }
})
