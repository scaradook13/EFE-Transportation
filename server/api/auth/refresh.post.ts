import argon2 from 'argon2'
import { verifyRefreshToken, generateTokens } from '../../utils/auth'
import { connectDB } from '../../utils/database'

export default defineEventHandler(async (event) => {
  try {
    const refreshToken = getCookie(event, 'refresh_token')

    if (!refreshToken) {
      throw createError({ statusCode: 401, message: 'Refresh token required' })
    }

    // Verify token signature against JWT_REFRESH_SECRET
    const payload = verifyRefreshToken(refreshToken)

    await connectDB()

    const { User } = await import('../../models/User')
    const user = await User.findById(payload.userId).select('+refreshTokenHash +isActive')

    if (!user || !user.isActive || !user.refreshTokenHash) {
      throw createError({ statusCode: 401, message: 'Invalid session' })
    }

    // Verify the hash matches the provided refresh token
    const isValid = await argon2.verify(user.refreshTokenHash, refreshToken)
    if (!isValid) {
      // Security: If hash doesn't match, the token might be compromised. Wipe it.
      user.refreshTokenHash = null
      await user.save()
      throw createError({ statusCode: 401, message: 'Invalid refresh token. Session compromised.' })
    }

    // Rotation: Generate fresh tokens
    const jwtPayload = {
      userId: user._id.toString(),
      username: user.username,
      role: user.role,
      fullName: user.fullName
    }
    
    const { accessToken: newAccessToken, refreshToken: newRefreshToken } = generateTokens(jwtPayload)

    // Save new refresh token hash to DB
    user.refreshTokenHash = await argon2.hash(newRefreshToken)
    user.lastActivity = new Date()
    await user.save()

    const isProduction = process.env.NODE_ENV === 'production'

    // Set new cookies
    setCookie(event, 'auth_token', newAccessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 60 * 60, // 1 hour
      path: '/'
    })

    setCookie(event, 'refresh_token', newRefreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/'
    })

    return successResponse(null, 'Session refreshed successfully')
  } catch (error: unknown) {
    // If refresh fails, clear the cookies to force re-login
    deleteCookie(event, 'auth_token', { path: '/' })
    deleteCookie(event, 'refresh_token', { path: '/' })
    
    if (error && typeof error === 'object' && 'statusCode' in error) throw error
    throw createError({ statusCode: 401, message: 'Authentication refresh failed' })
  }
})
