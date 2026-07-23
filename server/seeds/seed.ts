/**
 * Seed script for EFE Taxi Dispatch System
 * Run with: npm run seed
 */

import mongoose from 'mongoose'
import * as dotenv from 'dotenv'

dotenv.config()

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/efe_taxi_dispatch'

// Define schemas inline to avoid Nuxt runtime dependencies
import argon2 from 'argon2'

async function seed() {
  console.log('🌱 Connecting to MongoDB...')
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 })
  console.log('✅ Connected to MongoDB')

  // Clear existing data
  const db = mongoose.connection.db!
  const collections = await db.listCollections().toArray()
  for (const col of collections) {
    await db.collection(col.name).deleteMany({})
  }
  console.log('🧹 Cleared existing collections')

  // Create Users collection
  const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    fullName: { type: String, required: true },
    role: { type: String, enum: ['admin', 'dispatcher', 'hr'], required: true },
    isActive: { type: Boolean, default: true }
  }, { timestamps: true })

  const User = mongoose.models.User || mongoose.model('User', UserSchema)

  const hashedPassword = await argon2.hash('Admin@123')
  const dispatcherPassword = await argon2.hash('Dispatcher@123')
  const hrPassword = await argon2.hash('HR@123')

  const users = await User.insertMany([
    { username: 'admin', password: hashedPassword, fullName: 'System Administrator', role: 'admin', isActive: true },
    { username: 'dispatcher1', password: dispatcherPassword, fullName: 'Juan dela Cruz', role: 'dispatcher', isActive: true },
    { username: 'hr1', password: hrPassword, fullName: 'Maria Santos', role: 'hr', isActive: true }
  ])

  console.log('👤 Created users:')
  for (const u of users) {
    const user = u as { username: string; fullName: string; role: string }
    console.log(`   - ${user.username} (${user.role}) - ${user.fullName}`)
  }

  // Create Drivers
  const DriverSchema = new mongoose.Schema({
    driverId: { type: String, unique: true },
    fullName: { type: String, required: true },
    address: { type: String, required: true },
    contactNumber: { type: String, required: true },
    birthDate: { type: Date, required: true },
    emergencyContact: {
      name: { type: String, required: true },
      relationship: { type: String, required: true },
      contactNumber: { type: String, required: true }
    },
    licenseNumber: { type: String, required: true },
    licenseExpiration: { type: Date, required: true },
    photo: { type: String, default: null },
    employmentStatus: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
  }, { timestamps: true })

  const Driver = mongoose.models.Driver || mongoose.model('Driver', DriverSchema)

  const adminUser = users[0] as { _id: mongoose.Types.ObjectId }
  const driversData = [
    { driverId: 'DRV-0001', fullName: 'Pedro Reyes', address: '123 Mayon St, Quezon City', contactNumber: '09171234567', birthDate: new Date('1985-03-15'), emergencyContact: { name: 'Ana Reyes', relationship: 'Spouse', contactNumber: '09187654321' }, licenseNumber: 'N01-23-456789', licenseExpiration: new Date('2026-03-15'), employmentStatus: 'Active', createdBy: adminUser._id },
    { driverId: 'DRV-0002', fullName: 'Carlos Mendoza', address: '456 Rizal Ave, Manila', contactNumber: '09181234568', birthDate: new Date('1990-07-22'), emergencyContact: { name: 'Lito Mendoza', relationship: 'Father', contactNumber: '09188765432' }, licenseNumber: 'N01-23-987654', licenseExpiration: new Date('2025-07-22'), employmentStatus: 'Active', createdBy: adminUser._id },
    { driverId: 'DRV-0003', fullName: 'Roberto Flores', address: '789 Bonifacio St, Makati', contactNumber: '09191234569', birthDate: new Date('1988-11-10'), emergencyContact: { name: 'Grace Flores', relationship: 'Wife', contactNumber: '09198765433' }, licenseNumber: 'N01-23-111222', licenseExpiration: new Date('2027-11-10'), employmentStatus: 'Active', createdBy: adminUser._id },
    { driverId: 'DRV-0004', fullName: 'Antonio Bautista', address: '321 Mabini St, Pasig', contactNumber: '09201234570', birthDate: new Date('1995-01-05'), emergencyContact: { name: 'Rosa Bautista', relationship: 'Mother', contactNumber: '09208765434' }, licenseNumber: 'N01-23-333444', licenseExpiration: new Date('2028-01-05'), employmentStatus: 'Inactive', createdBy: adminUser._id },
    { driverId: 'DRV-0005', fullName: 'Emmanuel Torres', address: '654 Luna St, Caloocan', contactNumber: '09211234571', birthDate: new Date('1992-09-18'), emergencyContact: { name: 'Josie Torres', relationship: 'Spouse', contactNumber: '09218765435' }, licenseNumber: 'N01-23-555666', licenseExpiration: new Date('2026-09-18'), employmentStatus: 'Active', createdBy: adminUser._id }
  ]

  const drivers = await Driver.insertMany(driversData)
  console.log(`🚗 Created ${drivers.length} drivers`)

  // Create Taxi Units
  const TaxiUnitSchema = new mongoose.Schema({
    taxiNumber: { type: String, required: true, unique: true },
    plateNumber: { type: String, required: true, unique: true },
    brand: { type: String, required: true },
    model: { type: String, required: true },
    year: { type: Number, required: true },
    color: { type: String, required: true },
    status: { type: String, enum: ['Available', 'On Trip', 'Maintenance'], default: 'Available' }
  }, { timestamps: true })

  const TaxiUnit = mongoose.models.TaxiUnit || mongoose.model('TaxiUnit', TaxiUnitSchema)

  const taxiUnitsData = [
    { taxiNumber: 'TX-001', plateNumber: 'ABC 1234', brand: 'Toyota', model: 'Vios', year: 2022, color: 'Yellow', status: 'Available' },
    { taxiNumber: 'TX-002', plateNumber: 'DEF 5678', brand: 'Mitsubishi', model: 'Mirage G4', year: 2021, color: 'Yellow', status: 'Available' },
    { taxiNumber: 'TX-003', plateNumber: 'GHI 9012', brand: 'Honda', model: 'City', year: 2023, color: 'Yellow', status: 'Available' },
    { taxiNumber: 'TX-004', plateNumber: 'JKL 3456', brand: 'Toyota', model: 'Vios', year: 2020, color: 'Yellow', status: 'Maintenance' },
    { taxiNumber: 'TX-005', plateNumber: 'MNO 7890', brand: 'Suzuki', model: 'Dzire', year: 2022, color: 'Yellow', status: 'Available' }
  ]

  const taxiUnits = await TaxiUnit.insertMany(taxiUnitsData)
  console.log(`🚕 Created ${taxiUnits.length} taxi units`)

  // Create sample dispatches
  const DispatchSchema = new mongoose.Schema({
    dispatchNumber: { type: String, unique: true },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
    taxiUnit: { type: mongoose.Schema.Types.ObjectId, ref: 'TaxiUnit' },
    passengerName: { type: String, required: true },
    pickupLocation: { type: String, required: true },
    destination: { type: String, required: true },
    dispatcher: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['Active', 'Completed', 'Cancelled'], default: 'Active' },
    departureTime: { type: Date, required: true },
    arrivalTime: { type: Date, default: null },
    tripDuration: { type: Number, default: null },
    remarks: { type: String, default: '' }
  }, { timestamps: true })

  const Dispatch = mongoose.models.Dispatch || mongoose.model('Dispatch', DispatchSchema)

  const dispatcherUser = users[1] as { _id: mongoose.Types.ObjectId }
  const typedDrivers = drivers as Array<{ _id: mongoose.Types.ObjectId }>
  const typedTaxis = taxiUnits as Array<{ _id: mongoose.Types.ObjectId }>

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const dateStr = today.getFullYear().toString() + String(today.getMonth() + 1).padStart(2, '0') + String(today.getDate()).padStart(2, '0')

  const dispatchesData = [
    { dispatchNumber: `DSP-${dateStr}-0001`, driver: typedDrivers[0]._id, taxiUnit: typedTaxis[0]._id, passengerName: 'Maria Dela Rosa', pickupLocation: 'SM Mall of Asia', destination: 'Ninoy Aquino International Airport', dispatcher: dispatcherUser._id, status: 'Completed', departureTime: new Date(now.getTime() - 3 * 60 * 60 * 1000), arrivalTime: new Date(now.getTime() - 2 * 60 * 60 * 1000), tripDuration: 60, remarks: 'Rush trip' },
    { dispatchNumber: `DSP-${dateStr}-0002`, driver: typedDrivers[1]._id, taxiUnit: typedTaxis[1]._id, passengerName: 'Juan Reyes', pickupLocation: 'BGC High Street', destination: 'Ortigas Center', dispatcher: dispatcherUser._id, status: 'Completed', departureTime: new Date(now.getTime() - 2 * 60 * 60 * 1000), arrivalTime: new Date(now.getTime() - 90 * 60 * 1000), tripDuration: 30, remarks: '' },
    { dispatchNumber: `DSP-${dateStr}-0003`, driver: typedDrivers[2]._id, taxiUnit: typedTaxis[2]._id, passengerName: 'Ana Gonzales', pickupLocation: 'Makati Medical Center', destination: 'Quezon Avenue', dispatcher: dispatcherUser._id, status: 'Active', departureTime: new Date(now.getTime() - 30 * 60 * 1000), arrivalTime: null, tripDuration: null, remarks: 'VIP passenger' }
  ]

  await Dispatch.insertMany(dispatchesData)
  console.log(`📋 Created ${dispatchesData.length} sample dispatches`)

  // Create sample notifications
  const NotificationSchema = new mongoose.Schema({
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, enum: ['info', 'success', 'warning', 'error'], default: 'info' },
    isRead: { type: Boolean, default: false },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
  }, { timestamps: { createdAt: true, updatedAt: false } })

  const Notification = mongoose.models.Notification || mongoose.model('Notification', NotificationSchema)

  await Notification.insertMany([
    { title: 'Welcome to EFE Taxi Dispatch System', message: 'System is ready. Start dispatching taxis efficiently!', type: 'success', isRead: false, user: adminUser._id },
    { title: 'License Expiry Alert', message: 'Driver DRV-0002 license expires in 30 days', type: 'warning', isRead: false, user: adminUser._id }
  ])

  console.log('🔔 Created sample notifications')

  console.log('\n✅ Seed completed successfully!')
  console.log('\n📋 Login Credentials:')
  console.log('   Admin     → username: admin        | password: Admin@123')
  console.log('   Dispatcher → username: dispatcher1 | password: Dispatcher@123')
  console.log('   HR        → username: hr1          | password: HR@123')

  await mongoose.disconnect()
  process.exit(0)
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err)
  process.exit(1)
})
