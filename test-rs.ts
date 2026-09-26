import mongoose from 'mongoose'

async function run() {
  await mongoose.connect('mongodb://localhost:27017/efe_taxi_dispatch')
  const result = await mongoose.connection.db!.admin().command({ isMaster: 1 })
  console.log('Is Replica Set?', !!result.setName)
  await mongoose.disconnect()
}
run()
