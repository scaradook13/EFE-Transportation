import { User } from '../models/User'
import { Driver } from '../models/Driver'
import { biometricBridge, type BiometricCandidate } from './biometricBridge'

/**
 * Asserts that a scanned fingerprint template is not already registered anywhere in the system
 * (across all users and all drivers).
 * 
 * Throws a 409 Conflict error with a clear explanation if a duplicate fingerprint is detected.
 */
export async function assertFingerprintIsUnique(
  newTemplate: string,
  currentSubjectId: string,
  currentSubjectType: 'user' | 'driver'
): Promise<void> {
  // Query all enrolled users and drivers with their biometric templates
  const [enrolledUsers, enrolledDrivers] = await Promise.all([
    User.find({ 'biometric.enrolled': true }).select('_id fullName username role +biometric.template'),
    Driver.find({ 'biometric.enrolled': true }).select('_id fullName driverId employmentStatus +biometric.template')
  ])

  // Filter out the current account being updated (so a user/driver re-enrolling their own profile won't falsely flag itself)
  const candidates: BiometricCandidate[] = []

  for (const u of enrolledUsers) {
    if (currentSubjectType === 'user' && u._id.toString() === currentSubjectId) {
      continue
    }
    if (u.biometric?.template && u.biometric.template.length > 50) {
      candidates.push({
        id: u._id.toString(),
        name: u.fullName,
        identifier: u.username,
        type: 'user',
        template: u.biometric.template
      })
    }
  }

  for (const d of enrolledDrivers) {
    if (currentSubjectType === 'driver' && d._id.toString() === currentSubjectId) {
      continue
    }
    if (d.biometric?.template && d.biometric.template.length > 50) {
      candidates.push({
        id: d._id.toString(),
        name: d.fullName,
        identifier: d.driverId,
        type: 'driver',
        template: d.biometric.template
      })
    }
  }

  if (candidates.length === 0) {
    return
  }

  // 1. Fast exact string check
  const exactMatch = candidates.find(c => c.template === newTemplate)
  if (exactMatch) {
    const roleOrType = exactMatch.type === 'driver' ? 'Driver' : 'User'
    throw createError({
      statusCode: 409,
      statusMessage: 'Conflict',
      message: `This fingerprint is already registered in the system to ${roleOrType} "${exactMatch.name}" (${exactMatch.identifier}). Each fingerprint can only be registered once.`
    })
  }

  // 2. Biometric ANSI minutiae feature comparison via DigitalPersona C# bridge engine
  const checkResult = await biometricBridge.checkDuplicate(newTemplate, candidates)
  if (checkResult.isDuplicate && checkResult.matchedCandidate) {
    const match = checkResult.matchedCandidate
    const roleOrType = match.type === 'driver' ? 'Driver' : 'User'
    throw createError({
      statusCode: 409,
      statusMessage: 'Conflict',
      message: `This fingerprint is already registered in the system to ${roleOrType} "${match.name}" (${match.identifier}). Each fingerprint can only be registered once.`
    })
  }
}
