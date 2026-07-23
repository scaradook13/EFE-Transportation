import { verifyToken } from '../utils/auth'

const publicRoutes = [
  '/api/auth/login',
  '/api/auth/refresh'
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

  const token = getCookie(event, 'auth_token')

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
