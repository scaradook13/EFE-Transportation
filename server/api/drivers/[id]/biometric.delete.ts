import { Driver } from '../../../models/Driver'

export default defineEventHandler(async (event) => {
  const authUser = requireAuth(event)
  const targetDriverId = getRouterParam(event, 'id')!
  await connectDB()

  const driver = await Driver.findById(targetDriverId)
  if (!driver) {
    throw createError({ statusCode: 404, message: 'Driver not found' })
  }

  const prevFinger = driver.biometric?.finger || 'Fingerprint'

  driver.biometric = {
    enrolled: false,
    template: null,
    finger: 'Right Index',
    enrolledAt: null
  }
  driver.updatedBy = authUser.userId as any

  await driver.save()

  logAudit(
    event,
    authUser.userId,
    'DRIVER_BIOMETRIC_REMOVED',
    'Drivers',
    `Removed fingerprint biometric data (${prevFinger}) for driver: ${driver.fullName} (${driver.driverId})`
  )

  return successResponse({
    driverId: driver.driverId,
    fullName: driver.fullName,
    biometric: {
      enrolled: false,
      finger: 'Right Index',
      enrolledAt: null
    }
  }, 'Driver fingerprint biometric data removed successfully')
})
