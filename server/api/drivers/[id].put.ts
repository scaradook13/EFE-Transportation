import mongoose from 'mongoose'
import { driverService } from '~~/server/services/driverService'
import { driverSchema } from '~~/shared/utils/validations'
import { handleZodError } from '~~/server/utils/response'

export default defineEventHandler(async (event) => {
  const authUser = requireAuth(event)
  await connectDB()
  const id = getRouterParam(event, 'id')!

  try {
    const body = await readBody(event)
    const parsed = await driverSchema.partial().parseAsync(body)
    
    if (parsed.driverId) {
      const existing = await mongoose.model('Driver').findOne({ driverId: parsed.driverId, _id: { $ne: id } })
      if (existing) {
        setResponseStatus(event, 409)
        return { success: false, message: `Driver ID "${parsed.driverId}" is already in use. Please choose another ID.` }
      }
    }
  
    // Check for active assignment
    const existingDriver = await driverService.getById(id)
    if (existingDriver?.operationalStatus === 'Active') {
      logAudit(event, authUser.userId, 'Attempted Edit Driver', 'Drivers', 'Blocked: Driver is currently on duty')
      throw createError({
        statusCode: 409,
        message: 'This driver is currently on duty and cannot be edited until the assigned taxi has been returned.',
      })
    }

    const oldEmploymentStatus = existingDriver?.employmentStatus
    const oldOpStatus = existingDriver?.operationalStatus

    const driver = await driverService.update(id, { ...parsed, updatedBy: authUser.userId })

    if (parsed.employmentStatus === 'Active' && oldEmploymentStatus !== 'Active' && oldOpStatus !== 'Active') {
      logAudit(
        event, 
        authUser.userId, 
        'Driver Employment Status Updated', 
        'Drivers', 
        `Employment Status: ${oldEmploymentStatus} → Active | Duty Status: ${oldOpStatus} → Available (Automatic)`
      )
    } else {
      logAudit(event, authUser.userId, 'UPDATE_DRIVER', 'Drivers', `Updated driver: ${driver?.fullName}`)
    }

    return successResponse(driver, 'Driver updated successfully')
  } catch (err) {
    handleZodError(err)
  }
})
