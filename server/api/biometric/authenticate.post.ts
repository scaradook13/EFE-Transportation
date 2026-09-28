import { User } from '../../models/User'
import { Driver } from '../../models/Driver'
import { biometricBridge } from '../../utils/biometricBridge'
import jwt from 'jsonwebtoken'

export default defineEventHandler(async (event) => {
  await connectDB()
  const body = await readBody(event).catch(() => ({}))
  const mode = body.mode || (body.userId ? '1:1' : '1:N')
  const targetType = body.targetType || 'user' // 'user' or 'driver'
  const config = useRuntimeConfig()

  const template = body.template ? String(body.template) : ''

  if (mode === '1:1') {
    if (!body.userId) {
      throw createError({ statusCode: 400, message: 'User/Driver ID is required for 1:1 biometric verification.' })
    }

    if (!template) {
      throw createError({ statusCode: 400, message: 'Fingerprint reader not detected on this device. Please connect your fingerprint reader.' })
    }

    // --- Driver biometric authentication ---
    if (targetType === 'driver') {
      const driver = await Driver.findById(body.userId).select('+biometric.template')
      if (!driver) {
        throw createError({ statusCode: 404, message: 'Driver not found.' })
      }

      if (driver.employmentStatus !== 'Active') {
        throw createError({ statusCode: 403, message: 'Driver is not currently active.' })
      }

      if (!driver.biometric?.enrolled || !driver.biometric?.template || driver.biometric.template.length < 100) {
        logAudit(event, driver._id.toString(), 'BIOMETRIC_AUTH_FAILED', 'Auth', `Driver ${driver.fullName} (${driver.driverId}) attempted biometric verification without valid enrolled fingerprint`)
        throw createError({ statusCode: 400, message: `Driver ${driver.fullName} has not enrolled their fingerprint. Please register biometrics in the driver profile first.` })
      }

      const checkResult = await biometricBridge.checkDuplicate(template, [{
        id: driver._id.toString(),
        name: driver.fullName,
        identifier: driver.driverId,
        type: 'driver',
        template: driver.biometric.template
      }])

      if (checkResult.error && !checkResult.isDuplicate) {
        throw createError({ statusCode: 503, message: 'Biometric scanner service is offline. Please ensure DigitalPersona service is running.' })
      }

      if (checkResult.isDuplicate) {
        logAudit(event, driver._id.toString(), 'BIOMETRIC_AUTH_SUCCESS', 'Auth', `Driver biometric 1:1 verification succeeded for ${driver.fullName} (${driver.driverId})`)

        const biometricToken = jwt.sign(
          { userId: driver._id.toString(), driverId: driver.driverId, fullName: driver.fullName, type: 'driver_biometric_auth' },
          config.jwtSecret,
          { expiresIn: '5m' }
        )

        return successResponse({
          verified: true,
          match: true,
          user: {
            userId: driver._id.toString(),
            driverId: driver.driverId,
            fullName: driver.fullName
          },
          biometricToken
        }, `Driver ${driver.fullName} verified successfully`)
      } else {
        logAudit(event, driver._id.toString(), 'BIOMETRIC_AUTH_FAILED', 'Auth', `Driver biometric 1:1 verification failed for ${driver.fullName} (${driver.driverId})`)
        throw createError({ statusCode: 401, message: 'Fingerprint not recognized. Please try again.' })
      }
    }

    // --- User biometric authentication (original flow) ---
    const user = await User.findById(body.userId).select('+biometric.template')
    if (!user) {
      throw createError({ statusCode: 404, message: 'User not found.' })
    }

    if (!user.isActive) {
      throw createError({ statusCode: 403, message: 'Account is deactivated.' })
    }

    if (!user.biometric?.enrolled || !user.biometric?.template || user.biometric.template.length < 100) {
      logAudit(event, user._id.toString(), 'BIOMETRIC_AUTH_FAILED', 'Auth', 'Attempted 1:1 biometric verification without valid enrolled fingerprint')
      throw createError({ statusCode: 400, message: 'Your biometric registration is outdated or invalid. Please re-register your fingerprint in your profile.' })
    }

    const checkResult = await biometricBridge.checkDuplicate(template, [{
      id: user._id.toString(),
      name: user.fullName,
      identifier: user.username,
      type: 'user',
      template: user.biometric.template
    }])

    if (checkResult.error && !checkResult.isDuplicate) {
      throw createError({ statusCode: 503, message: 'Biometric scanner service is offline. Please ensure DigitalPersona service is running.' })
    }

    if (checkResult.isDuplicate) {
      logAudit(event, user._id.toString(), 'BIOMETRIC_AUTH_SUCCESS', 'Auth', `Biometric 1:1 verification succeeded for ${user.fullName} (${user.username})`)

      const biometricToken = jwt.sign(
        { userId: user._id.toString(), username: user.username, role: user.role, type: 'biometric_auth' },
        config.jwtSecret,
        { expiresIn: '5m' }
      )

      return successResponse({
        verified: true,
        match: true,
        user: {
          userId: user._id.toString(),
          username: user.username,
          fullName: user.fullName,
          role: user.role
        },
        biometricToken
      }, 'Fingerprint verified successfully')
    } else {
      logAudit(event, user._id.toString(), 'BIOMETRIC_AUTH_FAILED', 'Auth', `Biometric 1:1 verification failed for ${user.fullName} (${user.username})`)
      throw createError({ statusCode: 401, message: 'Fingerprint not recognized. Please try again.' })
    }
  } else {
    // Mode 1:N
    if (!template) {
      throw createError({ statusCode: 400, message: 'Fingerprint reader not detected on this device. Please connect your fingerprint reader.' })
    }

    const allEnrolledUsers = await User.find({ 'biometric.enrolled': true, isActive: true }).select('_id fullName username role email isPrimaryAdmin +biometric.template')
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
      const matched = await User.findById(checkResult.matchedCandidate.id)
      if (!matched || !matched.isActive) {
        throw createError({ statusCode: 403, message: 'Account is deactivated.' })
      }

      logAudit(event, matched._id.toString(), 'BIOMETRIC_AUTH_SUCCESS', 'Auth', `Biometric 1:N identification succeeded for ${matched.fullName} (${matched.username})`)

      const biometricToken = jwt.sign(
        { userId: matched._id.toString(), username: matched.username, role: matched.role, type: 'biometric_auth' },
        config.jwtSecret,
        { expiresIn: '5m' }
      )

      return successResponse({
        verified: true,
        match: true,
        user: {
          userId: matched._id.toString(),
          username: matched.username,
          fullName: matched.fullName,
          role: matched.role
        },
        biometricToken
      }, `Welcome, ${matched.fullName}`)
    } else {
      logAudit(event, 'unknown', 'BIOMETRIC_AUTH_FAILED', 'Auth', 'Biometric 1:N identification failed — no match')
      throw createError({ statusCode: 401, message: 'Fingerprint not recognized. Please try again.' })
    }
  }
})
