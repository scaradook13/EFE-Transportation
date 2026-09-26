import mongoose from 'mongoose'
import { User } from './server/models/User'
import { authService } from './server/services/authService'
import authMiddleware from './server/middleware/auth'
import { getCookie, getHeader } from 'h3'

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
// Mock H3 functions
import * as h3 from 'h3'
const mockH3 = h3 as any
mockH3.getRequestPath = (event: any) => event.path
mockH3.getCookie = (event: any, name: string) => event.cookies[name]
mockH3.getHeader = (event: any, name: string) => event.headers[name]

async function runTest() {
  await mongoose.connect('mongodb://localhost:27017/efe_taxi_dispatch')
  
  // 1. Create a test user
  await User.deleteOne({ username: 'revoked_test_user' })
  const user = new User({
    username: 'revoked_test_user',
    password: 'password123',
    fullName: 'Revoked Test',
    role: 'dispatcher',
    isActive: true
  })
  await user.save()

  // 2. Login
  const { accessToken } = await authService.login({ username: 'revoked_test_user', password: 'password123' })

  // 3. Test active token
  const event1 = {
    path: '/api/drivers',
    cookies: { auth_token: accessToken },
    headers: {},
    context: {}
  }
  
  try {
    await authMiddleware(event1 as any)
    console.log('PASS: Token accepted for active user.')
  } catch (e) {
    console.log('FAIL: Token incorrectly rejected.', e)
  }

  // 4. Deactivate user
  user.isActive = false
  await user.save()

  // 5. Test token after deactivation
  const event2 = { ...event1, context: {} }
  try {
    await authMiddleware(event2 as any)
    console.log('FAIL: Token accepted after deactivation!')
  } catch (e: any) {
    if (e.statusCode === 403) {
      console.log('PASS: Token rejected after deactivation.')
    } else {
      console.log('FAIL: Wrong error after deactivation:', e)
    }
  }

  // 6. Test logout (wipe refresh token)
  user.isActive = true
  user.refreshTokenHash = null as any
  await user.save()

  const event3 = { ...event1, context: {} }
  try {
    await authMiddleware(event3 as any)
    console.log('FAIL: Token accepted after logout!')
  } catch (e: any) {
    if (e.statusCode === 401) {
      console.log('PASS: Token rejected after logout.')
    } else {
      console.log('FAIL: Wrong error after logout:', e)
    }
  }

  // Cleanup
  await User.deleteOne({ username: 'revoked_test_user' })
  await mongoose.disconnect()
}

runTest()
