import mongoose from 'mongoose'
import { boundaryReportService } from './server/services/boundaryReportService'
import { DriverAssignment } from './server/models/DriverAssignment'
import { TaxiUnit } from './server/models/TaxiUnit'
import { User } from './server/models/User'
import { Driver } from './server/models/Driver'
import './server/models/Counter'

(global as any).createError = (err: any) => new Error(err.message)
;(global as any).useRuntimeConfig = () => ({ mongodbUri: 'mongodb://localhost:27017/efe_taxi_dispatch' })

async function runTest() {
  await mongoose.connect('mongodb://localhost:27017/efe_taxi_dispatch')

  let taxi = await TaxiUnit.findOne()
  let driver = await Driver.findOne()
  let user = await User.findOne()

  if (!taxi) {
    taxi = await TaxiUnit.create({
      taxiNumber: 'TEST-01',
      plateNumber: 'ABC-1234',
      brand: 'Toyota',
      model: 'Vios',
      year: 2024,
      color: 'White',
      taxiType: 'BATMAN',
      status: 'Available',
      createdBy: new mongoose.Types.ObjectId()
    })
  }

  if (!driver) {
    driver = await Driver.create({
      driverId: 'DRV-TEST',
      fullName: 'Test Driver',
      address: 'Test Address',
      contactNumber: '09123456789',
      birthDate: new Date('1990-01-01'),
      licenseNumber: 'L01-123',
      licenseExpiration: new Date('2030-01-01'),
      employmentStatus: 'Active',
      operationalStatus: 'Available',
      createdBy: new mongoose.Types.ObjectId()
    })
  }

  if (!user) {
    user = await User.create({
      username: 'testadmin',
      password: 'password123', // Doesn't matter for this test
      fullName: 'Test Admin',
      role: 'admin',
      isActive: true
    })
  }

  // Generate test assignments
  const assignments = []
  for (let i = 0; i < 5; i++) {
    assignments.push(new DriverAssignment({
      driver: driver._id,
      taxiUnit: taxi._id,
      issuedBy: user._id,
      assignedAt: new Date(),
      timeIn: new Date(),
      timeOut: new Date(),
      status: 'Completed',
      totalMinutes: 120,
      boundary: 500,
      remarks: 'Aggregation test'
    }))
  }
  await Promise.all(assignments.map(a => a.save()))

  console.log('Testing getFleetBoundaryReport...')
  const result = await boundaryReportService.getFleetBoundaryReport('daily')
  
  const taxiSummary = result.taxis.find(t => t._id === taxi._id.toString())
  console.log('Taxi Dispatches:', taxiSummary?.dispatches)
  console.log('Taxi Boundary:', taxiSummary?.boundary)
  console.log('Total Fleet Boundary:', result.summary.totalBoundary)

  // Cleanup
  await DriverAssignment.deleteMany({ remarks: 'Aggregation test' })

  await mongoose.disconnect()
}

runTest()
