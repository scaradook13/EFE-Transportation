import jwt from 'jsonwebtoken'
import type { H3Event } from 'h3'

export interface JwtPayload {
  userId: string
  username: string
  role: string
  fullName: string
}

export const verifyToken = (token: string): JwtPayload => {
  const config = useRuntimeConfig()
  try {
    return jwt.verify(token, config.jwtSecret) as JwtPayload
  } catch {
    throw createError({ statusCode: 401, message: 'Invalid or expired access token' })
  }
}

export const verifyRefreshToken = (token: string): JwtPayload => {
  const config = useRuntimeConfig()
  try {
    return jwt.verify(token, config.jwtRefreshSecret) as JwtPayload
  } catch {
    throw createError({ statusCode: 401, message: 'Invalid or expired refresh token' })
  }
}

export const generateTokens = (payload: JwtPayload, rememberMe: boolean = false) => {
  const config = useRuntimeConfig()
  
  const accessToken = jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpires as jwt.SignOptions['expiresIn']
  })

  const refreshToken = jwt.sign(payload, config.jwtRefreshSecret, {
    expiresIn: rememberMe ? '30d' : '7d'
  })

  return { accessToken, refreshToken }
}

export const requireAuth = (event: H3Event): JwtPayload => {
  const user = event.context.user

  if (!user) {
    throw createError({ statusCode: 401, message: 'Authentication required' })
  }

  return user as JwtPayload
}

export const requireRole = (event: H3Event, ...roles: string[]): JwtPayload => {
  const user = requireAuth(event)

  if (!roles.includes(user.role)) {
    throw createError({
      statusCode: 403,
      message: `Access denied. Required roles: ${roles.join(', ')}`
    })
  }

  return user
}
