import { Driver } from '../../../../models/Driver'
import { z } from 'zod'
import { handleZodError } from '../../../../utils/response'
import { assertFingerprintIsUnique } from '../../../../utils/biometricDeduplication'

const enrollSchema = z.object({
  template: z.string().min(1, 'Biometric template is required.'),
  templateId: z.string().optional(),
  finger: z.string().optional().default('Right Index')
})

export default defineEventHandler(async (event) => {
  const authUser = requireRole(event, 'admin', 'hr')
  const targetDriverId = getRouterParam(event, 'id')!
  await connectDB()

  try {
    const body = await readBody(event)
    const parsed = await enrollSchema.parseAsync(body)

    const driver = await Driver.findById(targetDriverId)
    if (!driver) {
      throw createError({ statusCode: 404, message: 'Driver not found' })
    }

    const templateToEnroll = (parsed.template || parsed.templateId)!

    // Enforce Rule: Only one fingerprint copy is allowed across the entire system
    await assertFingerprintIsUnique(templateToEnroll, targetDriverId, 'driver')

    const wasEnrolled = !!driver.biometric?.enrolled

    driver.biometric = {
      enrolled: true,
      template: templateToEnroll,
      finger: parsed.finger || 'Right Index',
      enrolledAt: new Date()
    }
    driver.updatedBy = authUser.userId as any

    await driver.save()

    const action = wasEnrolled ? 'DRIVER_BIOMETRIC_RE_ENROLLED' : 'DRIVER_BIOMETRIC_ENROLLED'
    logAudit(
      event,
      authUser.userId,
      action,
      'Drivers',
      `${action === 'DRIVER_BIOMETRIC_RE_ENROLLED' ? 'Re-registered' : 'Enrolled'} fingerprint (${driver.biometric.finger}) for driver: ${driver.fullName} (${driver.driverId})`
    )

    return successResponse({
      driverId: driver.driverId,
      fullName: driver.fullName,
      biometric: {
        enrolled: driver.biometric.enrolled,
        finger: driver.biometric.finger,
        enrolledAt: driver.biometric.enrolledAt ? driver.biometric.enrolledAt.toISOString() : new Date().toISOString()
      }
    }, wasEnrolled ? 'Driver fingerprint re-registered successfully' : 'Driver fingerprint registered successfully')
  } catch (err) {
    handleZodError(err)
  }
})
