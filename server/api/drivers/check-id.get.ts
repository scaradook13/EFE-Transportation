import { Driver } from '../../models/Driver'
import mongoose from 'mongoose'

export default defineEventHandler(async (event) => {
  requireRole(event, 'admin', 'hr')
  await connectDB()

  const query = getQuery(event)
  const driverId = (query.driverId as string || '').trim()
  const excludeId = (query.excludeId as string || '').trim()

  if (!driverId) {
    return successResponse({ available: false, message: 'Driver ID is required' })
  }

  const filter: Record<string, any> = {
    driverId: { $regex: new RegExp(`^${escapeRegex(driverId)}$`, 'i') }
  }

  if (excludeId && mongoose.Types.ObjectId.isValid(excludeId)) {
    filter._id = { $ne: new mongoose.Types.ObjectId(excludeId) }
  }

  const existing = await Driver.exists(filter)

  if (existing) {
    return successResponse({
      available: false,
      message: `Driver ID "${driverId}" is already in use.`
    })
  }

  return successResponse({
    available: true,
    message: `Driver ID "${driverId}" is available.`
  })
})
