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

export default defineEventHandler((event) => {
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
    const user = verifyToken(token)
    event.context.user = user
  } catch {
    throw createError({ statusCode: 401, message: 'Invalid or expired access token' })
  }
})
