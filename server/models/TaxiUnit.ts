import mongoose, { Schema, type Document } from 'mongoose'
import type { TaxiType } from '../../shared/utils/boundary'


export type TaxiUnitStatus = 'Available' | 'In Use' | 'Maintenance'
export type { TaxiType }

export interface ITaxiUnit extends Document {
  _id: mongoose.Types.ObjectId
  taxiNumber: string
  plateNumber: string
  brand: string
  model: string
  year: number
  color: string
  taxiType: TaxiType
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
    taxiType: {
      type: String,
      enum: {
        values: ['BATMAN', 'SUPERMAN'],
        message: '{VALUE} is not a valid taxi type'
      },
      default: 'BATMAN',
      required: [true, 'Taxi type is required'],
      uppercase: true,
      trim: true,
      index: true
    },
    status: {
      type: String,
      enum: {
        values: ['Available', 'In Use', 'Maintenance'],
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

export const TaxiUnit = (mongoose.models.TaxiUnit || mongoose.model<ITaxiUnit>('TaxiUnit', TaxiUnitSchema)) as mongoose.Model<ITaxiUnit>
