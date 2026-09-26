import mongoose from 'mongoose'
import { Driver } from './server/models/Driver'
import { TaxiUnit } from './server/models/TaxiUnit'
import { DriverAssignment } from './server/models/DriverAssignment'
import { assignmentService } from './server/services/assignmentService'
import { User } from './server/models/User'

;(global as any).useRuntimeConfig = () => ({})
;(global as any).createError = (err: any) => {
  const e: any = new Error(err.message)
  e.statusCode = err.statusCode
  return e
}

async function runTest() {
  await mongoose.connect('mongodb://localhost:27017/efe_taxi_dispatch')

  const user = await User.findOne()
  const userId = user!._id.toString()

  // Scenario 1: Driver lock succeeds -> Taxi lock fails -> Rollback Driver
  console.log('--- TEST: ROLLBACK (TAXI FAILURE) ---')
  const driver1 = await Driver.create({
    driverId: 'RB-DRV-1', fullName: 'RB 1', address: 'T', contactNumber: '09123456789',
    birthDate: new Date('1990-01-01'), licenseNumber: 'L1', licenseExpiration: new Date('2030-01-01'),
    employmentStatus: 'Active', operationalStatus: 'Available', createdBy: userId
  })
  const taxi1 = await TaxiUnit.create({
    taxiNumber: 'RB-TAX-1', plateNumber: 'RBT 1', brand: 'T', model: 'M', year: 2020,
    color: 'W', taxiType: 'BATMAN', status: 'In Use' // Already in use!
  })

  try {
    await assignmentService.issue({
      driverId: driver1._id.toString(),
      taxiUnitId: taxi1._id.toString(),
      issuedBy: userId
    })
    console.log('FAIL: Should have thrown taxi not available')
  } catch (e: any) {
    if (e.message.includes('Taxi unit is not available')) {
      // Check rollback
      const d1 = await Driver.findById(driver1._id)
      if (d1?.operationalStatus === 'Available') {
        console.log('PASS: Driver was correctly rolled back to Available.')
      } else {
        console.log(`FAIL: Driver stuck in ${d1?.operationalStatus}`)
      }
    } else {
      console.log('FAIL: Unexpected error', e)
    }
  }

  // Scenario 2: Driver lock -> Taxi lock -> Assignment fails (Index Conflict)
  console.log('\n--- TEST: ROLLBACK (ASSIGNMENT FAILURE) ---')
  const driver2 = await Driver.create({
    driverId: 'RB-DRV-2', fullName: 'RB 2', address: 'T', contactNumber: '09123456789',
    birthDate: new Date('1990-01-01'), licenseNumber: 'L2', licenseExpiration: new Date('2030-01-01'),
    employmentStatus: 'Active', operationalStatus: 'Available', createdBy: userId
  })
  const taxi2 = await TaxiUnit.create({
    taxiNumber: 'RB-TAX-2', plateNumber: 'RBT 2', brand: 'T', model: 'M', year: 2020,
    color: 'W', taxiType: 'BATMAN', status: 'Available'
  })

  // Manually create an orphaned active assignment for driver2 to trigger E11000 later
  await DriverAssignment.create({
    driver: driver2._id,
    taxiUnit: taxi1._id, // some other taxi
    issuedBy: userId,
    assignedAt: new Date(),
    timeIn: new Date(),
    status: 'Active'
  })

  try {
    await assignmentService.issue({
      driverId: driver2._id.toString(),
      taxiUnitId: taxi2._id.toString(),
      issuedBy: userId
    })
    console.log('FAIL: Should have thrown index conflict')
  } catch (e: any) {
    if (e.message.includes('Index Conflict') || e.code === 11000 || e.message.includes('already assigned')) {
      // Check rollbacks
      const d2 = await Driver.findById(driver2._id)
      const t2 = await TaxiUnit.findById(taxi2._id)
      if (d2?.operationalStatus === 'Available' && t2?.status === 'Available') {
        console.log('PASS: Driver and Taxi were correctly rolled back to Available.')
      } else {
        console.log(`FAIL: Stuck states - Driver: ${d2?.operationalStatus}, Taxi: ${t2?.status}`)
      }
    } else {
      console.log('FAIL: Unexpected error', e)
    }
  }

  await Driver.deleteMany({ driverId: { $in: ['RB-DRV-1', 'RB-DRV-2'] } })
  await TaxiUnit.deleteMany({ taxiNumber: { $in: ['RB-TAX-1', 'RB-TAX-2'] } })
  await DriverAssignment.deleteMany({ driver: driver2._id })
  await mongoose.disconnect()
}

runTest()
