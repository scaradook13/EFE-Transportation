import { User } from '../../models/User'
import { authService } from '../../services/authService'
import { biometricBridge } from '../../utils/biometricBridge'

export default defineEventHandler(async (event) => {
  await connectDB()
  const body = await readBody(event).catch(() => ({}))
  const rememberMe = !!body.rememberMe

  let user: any = null

  const template = body.template ? String(body.template) : ''

  // 1:N Biometric Identification across all enrolled users
  const allEnrolledUsers = await User.find({ 'biometric.enrolled': true, isActive: true }).select('_id fullName username role email isPrimaryAdmin +biometric.template')
  if (allEnrolledUsers.length === 0) {
    throw createError({
      statusCode: 400,
      message: 'No fingerprint are registered'
    })
  }

  if (!template) {
    throw createError({
      statusCode: 400,
      message: 'Fingerprint reader not detected on this device. Please connect your fingerprint reader.'
    })
  }

  // Format candidates for native comparison
  const candidates = allEnrolledUsers.filter(u => u.biometric?.template).map(u => ({
    id: u._id.toString(),
    name: u.fullName,
    identifier: u.username,
    type: 'user' as const,
    template: u.biometric!.template!
  }))

  const checkResult = await biometricBridge.checkDuplicate(template, candidates)
  if (checkResult.error && !checkResult.isDuplicate) {
    throw createError({ statusCode: 503, message: 'Biometric scanner service is offline. Please ensure DigitalPersona service is running.' })
  }
  if (checkResult.isDuplicate && checkResult.matchedCandidate) {
    user = await User.findById(checkResult.matchedCandidate.id).select('+biometric.template')
  } else {
    logAudit(event, 'unknown', 'BIOMETRIC_LOGIN_FAILED', 'Auth', 'Fingerprint touch detected on login, but no matching user account found')
    throw createError({
      statusCode: 401,
      message: 'Failed login'
    })
  }

  // Create session cookies & update login timestamps
  const { accessToken, refreshToken, user: authUser } = await authService.loginWithUser(user, rememberMe)

  const isProduction = process.env.NODE_ENV === 'production'

  setCookie(event, 'auth_token', accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    maxAge: 60 * 60,
    path: '/'
  })

  setCookie(event, 'refresh_token', refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    maxAge: rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24 * 7,
    path: '/'
  })

  logAudit(event, user._id.toString(), 'LOGIN', 'Auth', `User ${user.username} logged in via biometric fingerprint`)

  return successResponse({ user: authUser }, `Welcome back, ${user.fullName}!`)
})
