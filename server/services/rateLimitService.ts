import { RateLimit } from '../models/RateLimit'
import { connectDB } from '../utils/database'

export const rateLimitService = {
  async checkRateLimit(identifier: string, maxAttempts = 5, windowMinutes = 15): Promise<void> {
    await connectDB()

    const record = await RateLimit.findOne({ identifier })

    if (record) {
      if (record.attempts >= maxAttempts) {
        const remainingSeconds = Math.max(0, Math.ceil((new Date(record.expiresAt).getTime() - Date.now()) / 1000))
        const remainingMinutes = Math.max(1, Math.ceil(remainingSeconds / 60))
        throw createError({
          statusCode: 429,
          message: `Too many attempts. Please try again in ${remainingMinutes} minute${remainingMinutes === 1 ? '' : 's'}.`
        })
      }
    }
  },

  async incrementAttempts(identifier: string, windowMinutes = 15): Promise<void> {
    await connectDB()

    const expiresAt = new Date(Date.now() + windowMinutes * 60 * 1000)

    await RateLimit.findOneAndUpdate(
      { identifier },
      { 
        $inc: { attempts: 1 },
        $set: { expiresAt }
      },
      { upsert: true }
    )
  },

  async resetAttempts(identifier: string): Promise<void> {
    await connectDB()
    await RateLimit.deleteOne({ identifier })
  }
}
