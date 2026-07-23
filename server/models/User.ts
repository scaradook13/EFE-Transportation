import mongoose, { Document, Schema } from 'mongoose'
import argon2 from 'argon2'

export type UserRole = 'admin' | 'dispatcher' | 'hr'

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId
  username: string
  password: string
  fullName: string
  role: UserRole
  isActive: boolean
  refreshTokenHash: string | null
  lastLogin: Date | null
  lastActivity: Date | null
  createdAt: Date
  updatedAt: Date
  comparePassword(candidatePassword: string): Promise<boolean>
}

const UserSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      lowercase: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [50, 'Username must not exceed 50 characters'],
      index: true
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false
    },
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      maxlength: [100, 'Full name must not exceed 100 characters']
    },
    role: {
      type: String,
      enum: {
        values: ['admin', 'dispatcher', 'hr'],
        message: '{VALUE} is not a valid role'
      },
      default: 'dispatcher',
      required: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    refreshTokenHash: {
      type: String,
      default: null,
      select: false
    },
    lastLogin: {
      type: Date,
      default: null
    },
    lastActivity: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete ret.password
        return ret
      }
    }
  }
)

// Hash password before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next()
  try {
    this.password = await argon2.hash(this.password)
    next()
  } catch (error) {
    next(error as Error)
  }
})

// Compare password method
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  try {
    return await argon2.verify(this.password, candidatePassword)
  } catch {
    return false
  }
}

export const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema)
