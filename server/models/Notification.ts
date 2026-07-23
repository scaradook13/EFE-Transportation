import mongoose, { Document, Schema } from 'mongoose'

export type NotificationType = 'info' | 'success' | 'warning' | 'error'

export interface INotification extends Document {
  _id: mongoose.Types.ObjectId
  title: string
  message: string
  type: NotificationType
  isRead: boolean
  user: mongoose.Types.ObjectId
  createdAt: Date
}

const NotificationSchema = new Schema<INotification>(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [150, 'Title must not exceed 150 characters']
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
      trim: true
    },
    type: {
      type: String,
      enum: {
        values: ['info', 'success', 'warning', 'error'],
        message: '{VALUE} is not a valid notification type'
      },
      default: 'info',
      required: true
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
      index: true
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false }
  }
)

export const Notification = mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema)
