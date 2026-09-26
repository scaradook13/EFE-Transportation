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

  // Make sure indexes are built
  await DriverAssignment.createIndexes()
  
  // Cleanup test data
  await DriverAssignment.deleteMany({ remarks: 'CONCURRENCY_TEST' })
  await Driver.deleteMany({ fullName: 'Concurrency Driver' })
  await TaxiUnit.deleteMany({ taxiNumber: 'TEST-1000' })
  
  const user = await User.findOne()
  const userId = user!._id.toString()

  const driver = await Driver.create({
    driverId: 'CONC-DRV',
    fullName: 'Concurrency Driver',
    address: 'Test',
    contactNumber: '09123456789',
    birthDate: new Date('1990-01-01'),
    licenseNumber: 'LIC-CONC',
    licenseExpiration: new Date('2030-01-01'),
    employmentStatus: 'Active',
    operationalStatus: 'Available',
    createdBy: userId
  })
  
  const taxi = await TaxiUnit.create({
    taxiNumber: 'TEST-1000',
    plateNumber: 'TST 1000',
    brand: 'Toyota',
    model: 'Vios',
    year: 2020,
    color: 'White',
    taxiType: 'BATMAN',
    status: 'Available'
  })

  console.log('--- STARTING 50 CONCURRENT ASSIGNMENTS ---')
  const promises = []
  for (let i = 0; i < 50; i++) {
    promises.push(
      assignmentService.issue({
        driverId: driver._id.toString(),
        taxiUnitId: taxi._id.toString(),
        issuedBy: userId,
        remarks: 'CONCURRENCY_TEST'
      }).then(() => 'SUCCESS').catch((e) => 'REJECTED: ' + e.message)
    )
  }

  const results = await Promise.all(promises)
  const successCount = results.filter(r => r === 'SUCCESS').length
  const rejectCount = results.length - successCount

  console.log(`Success: ${successCount}, Rejected: ${rejectCount}`)
  
  const activeAssignments = await DriverAssignment.countDocuments({ driver: driver._id, status: 'Active' })
  console.log(`Active assignments in DB: ${activeAssignments}`)
  
  const updatedDriver = await Driver.findById(driver._id)
  const updatedTaxi = await TaxiUnit.findById(taxi._id)
  console.log(`Driver operationalStatus: ${updatedDriver?.operationalStatus}`)
  console.log(`Taxi status: ${updatedTaxi?.status}`)

  if (successCount === 1 && activeAssignments === 1 && updatedDriver?.operationalStatus === 'Active' && updatedTaxi?.status === 'In Use') {
    console.log('PASS: Concurrency handled perfectly.')
  } else {
    console.log('FAIL: Concurrency broken!')
  }

  await mongoose.disconnect()
}

runTest()
