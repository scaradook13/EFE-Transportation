import mongoose, { Document, Schema } from 'mongoose'

export interface IAuditLog extends Document {
  _id: mongoose.Types.ObjectId
  user: mongoose.Types.ObjectId
  action: string
  module: string
  details: string
  ipAddress: string
  browser: string
  createdAt: Date
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    action: {
      type: String,
      required: [true, 'Action is required'],
      trim: true
    },
    module: {
      type: String,
      required: [true, 'Module is required'],
      trim: true,
      index: true
    },
    details: {
      type: String,
      trim: true,
      default: ''
    },
    ipAddress: {
      type: String,
      trim: true,
      default: 'Unknown'
    },
    browser: {
      type: String,
      trim: true,
      default: 'Unknown'
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false }
  }
)

export const AuditLog = mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema)
