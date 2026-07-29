import mongoose from 'mongoose'
import { driverService } from '../../services/driverService'
import { driverSchema } from '~~/shared/utils/validations'
import { handleZodError } from '~~/server/utils/response'

export default defineEventHandler(async (event) => {
  const authUser = requireAuth(event)
  await connectDB()

  try {
    const body = await readBody(event)
    const parsed = await driverSchema.parseAsync(body)
    
    const existing = await mongoose.model('Driver').findOne({ driverId: parsed.driverId })
    if (existing) {
      setResponseStatus(event, 409)
      return { success: false, message: `Driver ID "${parsed.driverId}" is already in use. Please choose another ID.` }
    }
  
    const driver = await driverService.create({
      ...parsed,
    createdBy: authUser.userId
  })

  logAudit(event, authUser.userId, 'CREATE_DRIVER', 'Drivers', `Created driver: ${driver.fullName} (${driver.driverId})`)

    return successResponse(driver, 'Driver created successfully', 201)
  } catch (err) {
    handleZodError(err)
  }
})
