import mongoose from 'mongoose'

let isConnected = false

/**
 * Connect to MongoDB singleton — safe to call multiple times.
 * Exported from server/utils so Nitro auto-imports it everywhere.
 */
export const connectDB = async (): Promise<typeof mongoose> => {
  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose
  }

  const config = useRuntimeConfig()
  const uri = config.mongodbUri

  if (!uri) {
    throw new Error('MONGODB_URI is not defined in runtime config')
  }

  try {
    await mongoose.connect(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    })
    isConnected = true
    console.log('✅ MongoDB connected successfully')
    return mongoose
  } catch (error) {
    isConnected = false
    console.error('❌ MongoDB connection error:', error)
    throw error
  }
}

export const disconnectDB = async (): Promise<void> => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect()
    isConnected = false
  }
}
