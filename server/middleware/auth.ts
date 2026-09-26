import { verifyToken } from '../utils/auth'

const publicRoutes = [
  '/api/auth/login',
  '/api/auth/biometric-login',
  '/api/auth/refresh',
  '/api/biometric/reader-status',
  '/api/biometric/authenticate',
  '/api/biometric/cancel',
  '/api/biometric/enroll/cancel'
]

export default defineEventHandler(async (event) => {
  const path = getRequestPath(event)

  // Only protect /api routes
  if (!path.startsWith('/api/')) {
    return
  }

  // Skip public auth routes
  if (publicRoutes.includes(path)) {
    return
  }

  const authHeader = getHeader(event, 'authorization')
  let token = getCookie(event, 'auth_token')
  if (!token && authHeader?.startsWith('Bearer ')) {
    token = authHeader.substring(7)
  }

  if (!token) {
    throw createError({ statusCode: 401, message: 'Authentication required' })
  }

  try {
    const userPayload = verifyToken(token)
    
    // Connect to DB and check revocation status
    const mongooseModule = await import('mongoose')
    const mongoose = mongooseModule.default || mongooseModule
    if (mongoose.connection.readyState !== 1) {
      const { connectDB } = await import('../utils/database')
      await connectDB()
    }
    
    const { User } = await import('../models/User')
    // Fetch isActive and refreshTokenHash (+ to include the select:false field)
    const dbUser = await User.findById(userPayload.userId).select('+refreshTokenHash isActive')
    
    if (!dbUser) {
      throw createError({ statusCode: 401, message: 'Account no longer exists' })
    }
    
    if (!dbUser.isActive) {
      throw createError({ statusCode: 403, message: 'Account has been deactivated' })
    }
    
    if (!dbUser.refreshTokenHash) {
      throw createError({ statusCode: 401, message: 'Session has been terminated' })
    }

    event.context.user = userPayload
  } catch (err: any) {
    console.log('AUTH MIDDLEWARE ERROR:', err);
    if (err.statusCode) throw err
    throw createError({ statusCode: 401, message: 'Invalid or expired access token' })
  }
})
