import mongoose, { Document, Schema } from 'mongoose'

export type DispatchStatus = 'Active' | 'Completed' | 'Cancelled'

export interface IDispatch extends Document {
  _id: mongoose.Types.ObjectId
  dispatchNumber: string
  driver: mongoose.Types.ObjectId
  taxiUnit: mongoose.Types.ObjectId
  passengerName: string
  pickupLocation: string
  destination: string
  dispatcher: mongoose.Types.ObjectId
  status: DispatchStatus
  departureTime: Date
  arrivalTime: Date | null
  tripDuration: number | null // in minutes
  remarks: string
  createdAt: Date
  updatedAt: Date
}

const DispatchSchema = new Schema<IDispatch>(
  {
    dispatchNumber: {
      type: String,
      unique: true,
      index: true
    },
    driver: {
      type: Schema.Types.ObjectId,
      ref: 'Driver',
      required: [true, 'Driver is required']
    },
    taxiUnit: {
      type: Schema.Types.ObjectId,
      ref: 'TaxiUnit',
      required: [true, 'Taxi unit is required']
    },
    passengerName: {
      type: String,
      required: [true, 'Passenger name is required'],
      trim: true,
      maxlength: [100, 'Passenger name must not exceed 100 characters']
    },
    pickupLocation: {
      type: String,
      required: [true, 'Pickup location is required'],
      trim: true
    },
    destination: {
      type: String,
      required: [true, 'Destination is required'],
      trim: true
    },
    dispatcher: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Dispatcher is required']
    },
    status: {
      type: String,
      enum: {
        values: ['Active', 'Completed', 'Cancelled'],
        message: '{VALUE} is not a valid dispatch status'
      },
      default: 'Active',
      required: true,
      index: true
    },
    departureTime: {
      type: Date,
      required: [true, 'Departure time is required'],
      index: true
    },
    arrivalTime: {
      type: Date,
      default: null
    },
    tripDuration: {
      type: Number,
      default: null
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

// Auto-generate dispatch number before saving
DispatchSchema.pre('save', async function (next) {
  if (!this.isNew || this.dispatchNumber) return next()

  const today = new Date()
  const dateStr = today.getFullYear().toString()
    + String(today.getMonth() + 1).padStart(2, '0')
    + String(today.getDate()).padStart(2, '0')

  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)

  const count = await mongoose.model('Dispatch').countDocuments({
    createdAt: { $gte: startOfDay, $lt: endOfDay }
  })

  this.dispatchNumber = `DSP-${dateStr}-${String(count + 1).padStart(4, '0')}`
  next()
})

// Auto-calculate trip duration when arrivalTime is set
DispatchSchema.pre('save', function (next) {
  if (this.arrivalTime && this.departureTime) {
    const durationMs = this.arrivalTime.getTime() - this.departureTime.getTime()
    this.tripDuration = Math.round(durationMs / 60000) // Convert to minutes
  }
  next()
})

export const Dispatch = mongoose.models.Dispatch || mongoose.model<IDispatch>('Dispatch', DispatchSchema)
