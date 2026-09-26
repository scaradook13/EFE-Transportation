import mongoose from 'mongoose'
import { DriverAssignment } from './server/models/DriverAssignment'

async function runExplain() {
  await mongoose.connect('mongodb://localhost:27017/efe_taxi_dispatch')

  const start = new Date(new Date().setDate(new Date().getDate() - 30)) // 30 days ago
  const end = new Date()

  // Find query
  const query = {
    status: 'Completed',
    assignedAt: { $gte: start, $lte: end }
  }

  console.log('Query:', query)

  const explainFind: any = await DriverAssignment.find(query).explain('executionStats')
  console.log('\n--- FIND EXECUTION STATS ---')
  console.log(JSON.stringify(explainFind, null, 2))
  
  // Also explain with taxiUnit filter (used in getTaxiBoundaryReport)
  const taxiId = new mongoose.Types.ObjectId()
  const queryTaxi = {
    taxiUnit: taxiId,
    status: 'Completed',
    assignedAt: { $gte: start, $lte: end }
  }
  
  const explainTaxi: any = await DriverAssignment.find(queryTaxi).explain('executionStats')
  console.log('\n--- TAXI QUERY EXECUTION STATS ---')
  console.log(JSON.stringify(explainTaxi, null, 2))

  await mongoose.disconnect()
}

runExplain()
