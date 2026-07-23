import mongoose, { Document, Schema } from 'mongoose'

export type TaxiUnitStatus = 'Available' | 'On Trip' | 'Maintenance'

export interface ITaxiUnit extends Document {
  _id: mongoose.Types.ObjectId
  taxiNumber: string
  plateNumber: string
  brand: string
  model: string
  year: number
  color: string
  status: TaxiUnitStatus
  createdAt: Date
  updatedAt: Date
}

const TaxiUnitSchema = new Schema<ITaxiUnit>(
  {
    taxiNumber: {
      type: String,
      required: [true, 'Taxi number is required'],
      unique: true,
      trim: true,
      index: true
    },
    plateNumber: {
      type: String,
      required: [true, 'Plate number is required'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true
    },
    brand: {
      type: String,
      required: [true, 'Brand is required'],
      trim: true
    },
    model: {
      type: String,
      required: [true, 'Model is required'],
      trim: true
    },
    year: {
      type: Number,
      required: [true, 'Year is required'],
      min: [1990, 'Year must be 1990 or later'],
      max: [new Date().getFullYear() + 1, 'Year cannot be in the future']
    },
    color: {
      type: String,
      required: [true, 'Color is required'],
      trim: true
    },
    status: {
      type: String,
      enum: {
        values: ['Available', 'On Trip', 'Maintenance'],
        message: '{VALUE} is not a valid status'
      },
      default: 'Available',
      required: true
    }
  },
  {
    timestamps: true
  }
)

export const TaxiUnit = mongoose.models.TaxiUnit || mongoose.model<ITaxiUnit>('TaxiUnit', TaxiUnitSchema)
