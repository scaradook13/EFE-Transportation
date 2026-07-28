import mongoose, { Document, Schema } from 'mongoose'

export type EmploymentStatus = 'Active' | 'Inactive' | 'Expired License'
export type OperationalStatus = 'Available' | 'Active' | 'Not Available'

export interface IDriver extends Document {
  _id: mongoose.Types.ObjectId
  driverId: string
  fullName: string
  address: string
  contactNumber: string
  birthDate: Date
  emergencyContact: {
    name?: string
    relationship?: string
    contactNumber?: string
  }
  licenseNumber: string
  licenseExpiration: Date
  photo: string | null
  photoFileId?: mongoose.Types.ObjectId | null
  tinId?: string
  sssId?: string
  philhealthId?: string
  pagibigId?: string
  dateHired?: Date | null
  employmentStatus: EmploymentStatus
  operationalStatus: OperationalStatus
  createdBy: mongoose.Types.ObjectId
  updatedBy: mongoose.Types.ObjectId | null
  createdAt: Date
  updatedAt: Date
}

const DriverSchema = new Schema<IDriver>(
  {
    driverId: {
      type: String,
      unique: true,
      index: true
    },
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      maxlength: [100, 'Full name must not exceed 100 characters']
    },
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true
    },
    contactNumber: {
      type: String,
      required: [true, 'Contact number is required'],
      trim: true
    },
    birthDate: {
      type: Date,
      required: [true, 'Birth date is required']
    },
    emergencyContact: {
      name: {
        type: String,
        trim: true,
        default: ''
      },
      relationship: {
        type: String,
        trim: true,
        default: ''
      },
      contactNumber: {
        type: String,
        trim: true,
        default: ''
      }
    },
    licenseNumber: {
      type: String,
      required: [true, 'License number is required'],
      trim: true,
      index: true
    },
    licenseExpiration: {
      type: Date,
      required: [true, 'License expiration is required']
    },
    photo: {
      type: String,
      default: null
    },
    photoFileId: {
      type: Schema.Types.ObjectId,
      default: null
    },
    tinId: {
      type: String,
      trim: true,
      maxlength: [20, 'TIN ID must not exceed 20 characters']
    },
    sssId: {
      type: String,
      trim: true,
      maxlength: [20, 'SSS ID must not exceed 20 characters']
    },
    philhealthId: {
      type: String,
      trim: true,
      maxlength: [20, 'PhilHealth ID must not exceed 20 characters']
    },
    pagibigId: {
      type: String,
      trim: true,
      maxlength: [20, 'Pag-IBIG ID must not exceed 20 characters']
    },
    dateHired: {
      type: Date,
      default: null
    },
    employmentStatus: {
      type: String,
      enum: {
        values: ['Active', 'Inactive', 'Expired License'],
        message: '{VALUE} is not a valid employment status'
      },
      default: 'Active',
      required: true
    },
    operationalStatus: {
      type: String,
      enum: {
        values: ['Available', 'Active', 'Not Available'],
        message: '{VALUE} is not a valid operational status'
      },
      default: 'Available',
      required: true,
      index: true
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    timestamps: true
  }
)

// Auto-generate driverId before saving
DriverSchema.pre('save', async function (next) {
  if (!this.isNew || this.driverId) return next()
  const count = await mongoose.model('Driver').countDocuments()
  this.driverId = `DRV-${String(count + 1).padStart(4, '0')}`
  next()
})

export const Driver = mongoose.models.Driver || mongoose.model<IDriver>('Driver', DriverSchema)
