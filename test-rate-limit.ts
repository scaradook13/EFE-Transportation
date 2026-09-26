import mongoose from 'mongoose'
import { User } from './server/models/User'
import { RateLimit } from './server/models/RateLimit'
import { rateLimitService } from './server/services/rateLimitService'
import { authService } from './server/services/authService'

;(global as any).useRuntimeConfig = () => ({ 
  mongodbUri: 'mongodb://localhost:27017/efe_taxi_dispatch',
  jwtSecret: 'testsecret',
  jwtRefreshSecret: 'testrefresh',
  jwtExpires: '1h'
})
;(global as any).createError = (err: any) => {
  const e: any = new Error(err.message)
  e.statusCode = err.statusCode
  return e
}

async function simulateLoginRequest(ip: string, username: string, password = 'wrong') {
  const userIdentifier = `user:${username.toLowerCase()}`
  const ipIdentifier = `ip:${ip}`
  
  try {
    await rateLimitService.checkRateLimit(ipIdentifier, 20, 15)
    await rateLimitService.checkRateLimit(userIdentifier, 5, 15)
    
    try {
      await authService.login({ username, password })
      // Success
      await rateLimitService.resetAttempts(ipIdentifier)
      await rateLimitService.resetAttempts(userIdentifier)
      return { status: 200 }
    } catch (authError: any) {
      if (authError.statusCode === 401 || authError.statusCode === 403) {
        await Promise.all([
          rateLimitService.incrementAttempts(ipIdentifier),
          rateLimitService.incrementAttempts(userIdentifier)
        ])
      }
      return { status: authError.statusCode, msg: authError.message }
    }
  } catch (rlError: any) {
    return { status: rlError.statusCode, msg: rlError.message }
  }
}

async function runTest() {
  await mongoose.connect('mongodb://localhost:27017/efe_taxi_dispatch')

  await RateLimit.deleteMany({ identifier: /test/ })
  await User.deleteOne({ username: 'testadmin_rl' })

  await User.create({
    username: 'testadmin_rl', password: 'password123', fullName: 'Test', role: 'admin', isActive: true
  })

  console.log('--- RATE LIMIT INTEGRATION TEST ---')

  // IP A + admin + wrong password -> 5 attempts
  console.log('1. Testing Account Limit (5 attempts)')
  let lastRes
  for (let i = 0; i < 5; i++) {
    lastRes = await simulateLoginRequest('192.168.1.50', 'testadmin_rl')
  }
  console.log(`5th attempt status: ${lastRes?.status} (Expected 401)`)
  
  // 6th attempt should hit account rate limit (429)
  const blockRes = await simulateLoginRequest('192.168.1.50', 'testadmin_rl')
  console.log(`6th attempt status: ${blockRes.status} (Expected 429) - ${blockRes.msg}`)

  // IP B + same admin + wrong password -> Should ALSO be blocked!
  console.log('\n2. Testing Account Limit from Different IP')
  const diffIpRes = await simulateLoginRequest('10.0.0.99', 'testadmin_rl')
  console.log(`Different IP status: ${diffIpRes.status} (Expected 429) - ${diffIpRes.msg}`)

  // IP A + different account -> Should NOT be blocked (unless IP limit of 20 is hit)
  console.log('\n3. Testing IP Limit isolated from Account Limit')
  const diffUserRes = await simulateLoginRequest('192.168.1.50', 'otheruser')
  console.log(`Different User status: ${diffUserRes.status} (Expected 401) - ${diffUserRes.msg}`)

  // Successful login resets counter
  console.log('\n4. Testing Successful Login Reset')
  // We need to clear the rate limit first to test successful login, since it's currently blocked
  await RateLimit.deleteMany({ identifier: /test/ })
  // 3 failed attempts
  await simulateLoginRequest('192.168.1.50', 'testadmin_rl')
  await simulateLoginRequest('192.168.1.50', 'testadmin_rl')
  await simulateLoginRequest('192.168.1.50', 'testadmin_rl')
  // 1 success
  const successRes = await simulateLoginRequest('192.168.1.50', 'testadmin_rl', 'password123')
  console.log(`Success Login status: ${successRes.status} (Expected 200)`)
  // Check if cleared
  const record = await RateLimit.findOne({ identifier: 'user:testadmin_rl' })
  console.log(`Record exists after success: ${!!record} (Expected false)`)

  await RateLimit.deleteMany({ identifier: /test/ })
  await User.deleteOne({ username: 'testadmin_rl' })
  await mongoose.disconnect()
}

runTest()
