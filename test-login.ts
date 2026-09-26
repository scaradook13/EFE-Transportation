import mongoose from 'mongoose'
import { User } from './server/models/User'
import { rateLimitService } from './server/services/rateLimitService'
import { authService } from './server/services/authService'
import { RateLimit } from './server/models/RateLimit'

// Mock h3 functions used in endpoints
(global as any).createError = (err: any) => {
  const e: any = new Error(err.message || err.statusMessage)
  e.statusCode = err.statusCode
  return e
}
;(global as any).useRuntimeConfig = () => ({ 
  mongodbUri: 'mongodb://localhost:27017/efe_taxi_dispatch',
  jwtSecret: 'testsecret',
  jwtRefreshSecret: 'testrefresh',
  jwtExpires: '1h'
})

async function runTest() {
  await mongoose.connect('mongodb://localhost:27017/efe_taxi_dispatch')

  const testIp = '192.168.1.100'

  console.log('--- TESTING RATE LIMIT AND LOGIN ---')

  // 1. Reset rate limit for test IP
  await rateLimitService.resetAttempts(testIp)
  console.log('Rate limit reset.')

  // 2. Simulate failed logins
  console.log('Simulating 5 failed logins...')
  for (let i = 0; i < 5; i++) {
    try {
      await authService.login({ username: 'nonexistent_user', password: 'wrongpassword' })
    } catch (e: any) {
      if (e.statusCode === 401 || e.statusCode === 403) {
        await rateLimitService.incrementAttempts(testIp)
      }
    }
  }

  // 3. Check rate limit
  try {
    await rateLimitService.checkRateLimit(testIp)
    console.log('FAIL: Rate limit did not trigger after 5 failures.')
  } catch (e: any) {
    if (e.statusCode === 429) {
      console.log('PASS: Rate limit triggered successfully (429).')
    } else {
      console.log('FAIL: Unexpected error from checkRateLimit:', e)
    }
  }

  // 4. Reset rate limit and simulate success
  await rateLimitService.resetAttempts(testIp)
  
  // Ensure a test user exists
  let user = await User.findOne({ username: 'testadmin' })
  if (!user) {
    user = new User({
      username: 'testadmin',
      password: 'password123',
      fullName: 'Test Admin',
      role: 'admin',
      isActive: true
    })
    await user.save()
  }

  try {
    const res = await authService.login({ username: 'testadmin', password: 'password123' })
    if (res.accessToken) {
      console.log('PASS: Successful login works.')
    }
  } catch (e) {
    console.log('FAIL: Successful login failed', e)
  }

  // Check RateLimit document TTL index
  await RateLimit.createIndexes()
  const indexes = await RateLimit.collection.getIndexes()
  if (indexes.expiresAt_1) {
    console.log('PASS: RateLimit expiresAt TTL index exists.')
  } else {
    console.log('FAIL: RateLimit expiresAt TTL index missing.')
  }

  await mongoose.disconnect()
}

runTest()
