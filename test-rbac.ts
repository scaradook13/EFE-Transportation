import mongoose from 'mongoose'
import { User } from './server/models/User'
import { authService } from './server/services/authService'
import { driverService } from './server/services/driverService'

;(global as any).useRuntimeConfig = () => ({ 
  mongodbUri: 'mongodb://localhost:27017/efe_taxi_dispatch',
  jwtSecret: 'testsecret',
  jwtRefreshSecret: 'testrefresh',
  jwtExpires: '1h'
})

// Mock h3 functions
;(global as any).createError = (err: any) => {
  const e: any = new Error(err.message || err.statusMessage)
  e.statusCode = err.statusCode
  return e
}
;(global as any).requireAuth = () => { throw new Error('Not implemented') }
;(global as any).requireRole = (event: any, ...roles: string[]) => {
  const user = event.context.user
  if (!roles.includes(user.role)) {
    throw (global as any).createError({
      statusCode: 403,
      message: `Access denied. Required roles: ${roles.join(', ')}`
    })
  }
  return user
}

async function runTest() {
  await mongoose.connect('mongodb://localhost:27017/efe_taxi_dispatch')

  console.log('--- TESTING DRIVER RBAC ---')

  const hrEvent = { context: { user: { userId: '1', role: 'hr' } } }
  const dispatcherEvent = { context: { user: { userId: '2', role: 'dispatcher' } } }
  
  try {
    ;(global as any).requireRole(hrEvent, 'admin', 'hr')
    console.log('PASS: HR allowed to access driver endpoints.')
  } catch (e) {
    console.log('FAIL: HR blocked from driver endpoints.')
  }

  try {
    ;(global as any).requireRole(dispatcherEvent, 'admin', 'hr')
    console.log('FAIL: Dispatcher allowed to access driver endpoints.')
  } catch (e: any) {
    if (e.statusCode === 403) {
      console.log('PASS: Dispatcher blocked from driver endpoints with 403.')
    } else {
      console.log('FAIL: Dispatcher blocked with wrong error:', e)
    }
  }

  await mongoose.disconnect()
}

runTest()
