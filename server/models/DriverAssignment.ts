import mongoose, { Schema, type Document } from 'mongoose'
import { Counter } from './Counter'

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
  boundary: number | null
  baseBoundary: number | null
  overtimeHours: number | null
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
    boundary: {
      type: Number,
      default: null
    },
    baseBoundary: {
      type: Number,
      default: null
    },
    overtimeHours: {
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

DriverAssignmentSchema.index({ taxiUnit: 1, status: 1, assignedAt: -1 })
DriverAssignmentSchema.index({ status: 1, assignedAt: -1 })

// Enforce at most ONE active assignment per driver or taxi
DriverAssignmentSchema.index(
  { driver: 1 },
  { unique: true, partialFilterExpression: { status: 'Active' }, name: 'unique_active_driver' }
)
DriverAssignmentSchema.index(
  { taxiUnit: 1 },
  { unique: true, partialFilterExpression: { status: 'Active' }, name: 'unique_active_taxi' }
)

// Auto-generate assignment number before saving
DriverAssignmentSchema.pre('save', async function (next) {
  if (!this.isNew || this.assignmentNumber) return next()

  const today = new Date()
  const dateStr = today.getFullYear().toString()
    + String(today.getMonth() + 1).padStart(2, '0')
    + String(today.getDate()).padStart(2, '0')

  const counterId = `assignment_seq_${dateStr}`

  // Use atomic findOneAndUpdate with upsert
  const counter = await Counter.findOneAndUpdate(
    { _id: counterId },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  )

  this.assignmentNumber = `ASN-${dateStr}-${String(counter?.seq || 1).padStart(4, '0')}`
  next()
})

export const DriverAssignment = (mongoose.models.DriverAssignment
  || mongoose.model<IDriverAssignment>('DriverAssignment', DriverAssignmentSchema)) as mongoose.Model<IDriverAssignment>
