import jwt from 'jsonwebtoken'
import type { H3Event } from 'h3'

export interface JwtPayload {
  userId: string
  username: string
  role: string
  fullName: string
}

export const getJwtSecret = (): string => {
  const config = useRuntimeConfig()
  return config.jwtSecret || process.env.JWT_SECRET || process.env.NUXT_JWT_SECRET || (process.env.NODE_ENV !== 'production' ? 'efe-taxi-super-secret-key-change-in-production' : '')
}

export const getJwtRefreshSecret = (): string => {
  const config = useRuntimeConfig()
  return config.jwtRefreshSecret || process.env.JWT_REFRESH_SECRET || process.env.NUXT_JWT_REFRESH_SECRET || (process.env.NODE_ENV !== 'production' ? 'efe-taxi-refresh-super-secret-key-change-in-production-2024' : '')
}

export const verifyToken = (token: string): JwtPayload => {
  try {
    return jwt.verify(token, getJwtSecret()) as JwtPayload
  } catch {
    throw createError({ statusCode: 401, message: 'Invalid or expired access token' })
  }
}

export const verifyRefreshToken = (token: string): JwtPayload => {
  try {
    return jwt.verify(token, getJwtRefreshSecret()) as JwtPayload
  } catch {
    throw createError({ statusCode: 401, message: 'Invalid or expired refresh token' })
  }
}

export const generateTokens = (payload: JwtPayload, rememberMe: boolean = false) => {
  const config = useRuntimeConfig()

  const accessToken = jwt.sign(payload, getJwtSecret(), {
    expiresIn: (config.jwtExpires || process.env.JWT_EXPIRES || '1h') as jwt.SignOptions['expiresIn']
  })

  const refreshToken = jwt.sign(payload, getJwtRefreshSecret(), {
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
