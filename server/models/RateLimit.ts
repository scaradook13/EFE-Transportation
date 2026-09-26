import mongoose, { Schema, type Document } from 'mongoose'

export interface IRateLimit extends Document {
  identifier: string
  attempts: number
  expiresAt: Date
}

const RateLimitSchema = new Schema<IRateLimit>({
  identifier: { type: String, required: true, index: true },
  attempts: { type: Number, default: 1 },
  expiresAt: { type: Date, required: true, index: { expires: 0 } }
})

export const RateLimit = (mongoose.models.RateLimit || mongoose.model<IRateLimit>('RateLimit', RateLimitSchema)) as mongoose.Model<IRateLimit>
