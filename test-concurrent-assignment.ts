import mongoose from 'mongoose'
import { DriverAssignment } from './server/models/DriverAssignment'
import { User } from './server/models/User'
import { Driver } from './server/models/Driver'
import { TaxiUnit } from './server/models/TaxiUnit'

async function runTest() {
  await mongoose.connect('mongodb://localhost:27017/efe_taxi_dispatch')

  const userId = new mongoose.Types.ObjectId()
  const driverId = new mongoose.Types.ObjectId()
  const taxiId = new mongoose.Types.ObjectId()

  console.log('Running concurrent assignment test...')
  
  const indexes = await DriverAssignment.collection.getIndexes()
  console.log('Indexes:', Object.keys(indexes))

  const promises = []
  for (let i = 0; i < 50; i++) {
    const assignment = new DriverAssignment({
      driver: driverId,
      taxiUnit: taxiId,
      issuedBy: userId,
      assignedAt: new Date(),
      timeIn: new Date(),
      status: 'Active',
      remarks: `Test concurrent ${i}`
    })
    promises.push(assignment.save())
  }

  try {
    const results = await Promise.all(promises)
    console.log('Success! Created assignments:')
    results.forEach(r => console.log(r.assignmentNumber))
  } catch (err) {
    console.error('Error during concurrent save:', err.message)
  }

  // Cleanup
  await DriverAssignment.deleteMany({ remarks: { $regex: /Test concurrent/ } })
  await mongoose.disconnect()
}

runTest()
