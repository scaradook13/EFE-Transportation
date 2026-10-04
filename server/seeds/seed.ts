/**
 * Seed script for EFE Taxi Dispatch System
 * Run with: npm run seed
 */

import mongoose from 'mongoose'
import * as dotenv from 'dotenv'
import argon2 from 'argon2'

dotenv.config()

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/efe_taxi_dispatch'

async function seed() {
  console.log('🌱 Connecting to MongoDB...')
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 })
  console.log('✅ Connected to MongoDB')

  // 1. Clear existing data across all collections
  const db = mongoose.connection.db!
  const collections = await db.listCollections().toArray()
  for (const col of collections) {
    await db.collection(col.name).deleteMany({})
  }
  console.log('🧹 Cleared existing collections')

  // 2. Create Users collection (Exactly 3 users: Admin, Dispatcher, HR)
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
  ] as any)

  console.log('👤 Created users:')
  for (const u of users) {
    const user = u as { username: string; fullName: string; role: string }
    console.log(`   - ${user.username} (${user.role}) - ${user.fullName}`)
  }

  // 3. Create Drivers (Exactly 4 drivers, all active and available)
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
    operationalStatus: { type: String, enum: ['Available', 'Active'], default: 'Available' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
  }, { timestamps: true })

  const Driver = mongoose.models.Driver || mongoose.model('Driver', DriverSchema)

  const adminUser = users[0] as { _id: mongoose.Types.ObjectId }
  const driversData = [
    {
      driverId: 'DRV-0001',
      fullName: 'Pedro Reyes',
      address: '123 Mayon St, Quezon City',
      contactNumber: '09171234567',
      birthDate: new Date('1985-03-15'),
      emergencyContact: { name: 'Ana Reyes', relationship: 'Spouse', contactNumber: '09187654321' },
      licenseNumber: 'N01-23-456789',
      licenseExpiration: new Date('2026-03-15'),
      employmentStatus: 'Active',
      operationalStatus: 'Available',
      createdBy: adminUser._id
    },
    {
      driverId: 'DRV-0002',
      fullName: 'Carlos Mendoza',
      address: '456 Rizal Ave, Manila',
      contactNumber: '09181234568',
      birthDate: new Date('1990-07-22'),
      emergencyContact: { name: 'Lito Mendoza', relationship: 'Father', contactNumber: '09188765432' },
      licenseNumber: 'N01-23-987654',
      licenseExpiration: new Date('2025-07-22'),
      employmentStatus: 'Active',
      operationalStatus: 'Available',
      createdBy: adminUser._id
    },
    {
      driverId: 'DRV-0003',
      fullName: 'Roberto Flores',
      address: '789 Bonifacio St, Makati',
      contactNumber: '09191234569',
      birthDate: new Date('1988-11-10'),
      emergencyContact: { name: 'Grace Flores', relationship: 'Wife', contactNumber: '09198765433' },
      licenseNumber: 'N01-23-111222',
      licenseExpiration: new Date('2027-11-10'),
      employmentStatus: 'Active',
      operationalStatus: 'Available',
      createdBy: adminUser._id
    },
    {
      driverId: 'DRV-0004',
      fullName: 'Emmanuel Torres',
      address: '654 Luna St, Caloocan',
      contactNumber: '09211234571',
      birthDate: new Date('1992-09-18'),
      emergencyContact: { name: 'Josie Torres', relationship: 'Spouse', contactNumber: '09218765435' },
      licenseNumber: 'N01-23-555666',
      licenseExpiration: new Date('2026-09-18'),
      employmentStatus: 'Active',
      operationalStatus: 'Available',
      createdBy: adminUser._id
    }
  ]

  const drivers = await Driver.insertMany(driversData as any)
  console.log(`🚗 Created ${drivers.length} drivers:`)
  for (const d of drivers) {
    const drv = d as { driverId: string; fullName: string; employmentStatus: string; operationalStatus: string }
    console.log(`   - ${drv.driverId}: ${drv.fullName} [${drv.employmentStatus} / ${drv.operationalStatus}]`)
  }

  // 4. Create Taxi Units (4 Available + 1 Under Maintenance = 5 total)
  const TaxiUnitSchema = new mongoose.Schema({
    taxiNumber: { type: String, required: true, unique: true },
    plateNumber: { type: String, required: true, unique: true },
    brand: { type: String, required: true },
    model: { type: String, required: true },
    year: { type: Number, required: true },
    color: { type: String, required: true },
    taxiType: { type: String, enum: ['BATMAN', 'SUPERMAN'], default: 'BATMAN', required: true },
    status: { type: String, enum: ['Available', 'In Use', 'Maintenance'], default: 'Available' }
  }, { timestamps: true })

  const TaxiUnit = mongoose.models.TaxiUnit || mongoose.model('TaxiUnit', TaxiUnitSchema)

  const taxiUnitsData: Array<{
    taxiNumber: string
    plateNumber: string
    brand: string
    model: string
    year: number
    color: string
    taxiType: 'BATMAN' | 'SUPERMAN'
    status: 'Available' | 'In Use' | 'Maintenance'
  }> = [
    { taxiNumber: 'TX-001', plateNumber: 'ABC 1234', brand: 'Toyota', model: 'Vios', year: 2022, color: 'Yellow', taxiType: 'BATMAN', status: 'Available' },
    { taxiNumber: 'TX-002', plateNumber: 'DEF 5678', brand: 'Mitsubishi', model: 'Mirage G4', year: 2021, color: 'Yellow', taxiType: 'SUPERMAN', status: 'Available' },
    { taxiNumber: 'TX-003', plateNumber: 'GHI 9012', brand: 'Honda', model: 'City', year: 2023, color: 'Yellow', taxiType: 'BATMAN', status: 'Available' },
    { taxiNumber: 'TX-004', plateNumber: 'MNO 7890', brand: 'Suzuki', model: 'Dzire', year: 2022, color: 'Yellow', taxiType: 'BATMAN', status: 'Available' },
    { taxiNumber: 'TX-005', plateNumber: 'JKL 3456', brand: 'Toyota', model: 'Vios', year: 2020, color: 'Yellow', taxiType: 'SUPERMAN', status: 'Maintenance' }
  ]

  const taxiUnits = await TaxiUnit.insertMany(taxiUnitsData as any)
  console.log(`🚕 Created ${taxiUnits.length} taxi units (4 Available, 1 Maintenance):`)
  for (const t of taxiUnits) {
    const unit = t as { taxiNumber: string; plateNumber: string; brand: string; model: string; taxiType: string; status: string }
    console.log(`   - ${unit.taxiNumber} (${unit.plateNumber}): ${unit.brand} ${unit.model} [${unit.taxiType}] → ${unit.status}`)
  }

  // No assignments seeded: dispatch board starts completely fresh
  console.log('📋 Assignments: 0 seeded (clean board ready for live operations)')

  console.log('\n✅ Database seed completed successfully!')
  console.log('\n📋 Login Credentials:')
  console.log('   Admin      → username: admin        | password: Admin@123')
  console.log('   Dispatcher → username: dispatcher1  | password: Dispatcher@123')
  console.log('   HR         → username: hr1          | password: HR@123')
  console.log('\n💡 Tip: If you were previously logged in, remember to log out and log in again with these credentials.\n')

  await mongoose.disconnect()
  process.exit(0)
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err)
  process.exit(1)
})
