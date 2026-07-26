import mongoose, { Document, Schema } from 'mongoose'

export type AssignmentStatus = 'Active' | 'Completed'

export interface IDriverAssignment extends Document {
  _id: mongoose.Types.ObjectId
  assignmentNumber: string
  driver: mongoose.Types.ObjectId
  taxiUnit: mongoose.Types.ObjectId
  issuedBy: mongoose.Types.ObjectId
  assignedAt: Date
  returnedAt: Date | null
  timeIn: Date
  timeOut: Date | null
  totalMinutes: number | null
  totalHours: number | null
  status: AssignmentStatus
  remarks: string
  createdAt: Date
  updatedAt: Date
}

const DriverAssignmentSchema = new Schema<IDriverAssignment>(
  {
    assignmentNumber: {
      type: String,
      unique: true,
      index: true
    },
    driver: {
      type: Schema.Types.ObjectId,
      ref: 'Driver',
      required: [true, 'Driver is required'],
      index: true
    },
    taxiUnit: {
      type: Schema.Types.ObjectId,
      ref: 'TaxiUnit',
      required: [true, 'Taxi unit is required'],
      index: true
    },
    issuedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Issuer is required']
    },
    assignedAt: {
      type: Date,
      required: true
    },
    returnedAt: {
      type: Date,
      default: null
    },
    timeIn: {
      type: Date,
      required: true
    },
    timeOut: {
      type: Date,
      default: null
    },
    totalMinutes: {
      type: Number,
      default: null
    },
    totalHours: {
      type: Number,
      default: null
    },
    status: {
      type: String,
      enum: {
        values: ['Active', 'Completed'],
        message: '{VALUE} is not a valid assignment status'
      },
      default: 'Active',
      required: true,
      index: true
    },
    remarks: {
      type: String,
      trim: true,
      default: ''
    }
  },
  {
    timestamps: true
  }
)

// Auto-generate assignment number before saving
DriverAssignmentSchema.pre('save', async function (next) {
  if (!this.isNew || this.assignmentNumber) return next()

  const today = new Date()
  const dateStr = today.getFullYear().toString()
    + String(today.getMonth() + 1).padStart(2, '0')
    + String(today.getDate()).padStart(2, '0')

  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)

  const count = await mongoose.model('DriverAssignment').countDocuments({
    createdAt: { $gte: startOfDay, $lt: endOfDay }
  })

  this.assignmentNumber = `ASN-${dateStr}-${String(count + 1).padStart(4, '0')}`
  next()
})

export const DriverAssignment = mongoose.models.DriverAssignment
  || mongoose.model<IDriverAssignment>('DriverAssignment', DriverAssignmentSchema)
