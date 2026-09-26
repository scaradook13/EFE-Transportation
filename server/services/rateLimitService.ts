import { RateLimit } from '../models/RateLimit'
import { connectDB } from '../utils/database'

export const rateLimitService = {
  async checkRateLimit(identifier: string, maxAttempts = 5, windowMinutes = 15): Promise<void> {
    await connectDB()

    const record = await RateLimit.findOne({ identifier })

    if (record) {
      if (record.attempts >= maxAttempts) {
        throw createError({
          statusCode: 429,
          message: 'Too many login attempts. Please try again later.'
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
        $setOnInsert: { expiresAt }
      },
      { upsert: true }
    )
  },

  async resetAttempts(identifier: string): Promise<void> {
    await connectDB()
    await RateLimit.deleteOne({ identifier })
  }
}
