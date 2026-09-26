import { authService } from '../../services/authService'
import { rateLimitService } from '../../services/rateLimitService'
import { loginSchema } from '~~/shared/utils/validations'
import { handleZodError } from '~~/server/utils/response'
import { z } from 'zod'

export default defineEventHandler(async (event) => {
  const ip = getRequestIP(event) || 'unknown-ip'
  let username = ''
  
  try {
    const body = await readBody(event).catch(() => ({}))
    username = (body.username || '').toString().toLowerCase().trim()
    const userIdentifier = `user:${username}`
    
    // 1. Dual-layer Rate Limit Check
    await rateLimitService.checkRateLimit(`ip:${ip}`, 20, 15)
    if (username) {
      await rateLimitService.checkRateLimit(userIdentifier, 5, 15)
    }
    
    // 2. Validate request
    const parsed = await loginSchema.extend({ rememberMe: z.boolean().optional().default(false) }).parseAsync(body)

    // 3. Authenticate
    const { accessToken, refreshToken, user } = await authService.login(parsed)

    // 4. Reset Rate Limits on success
    await rateLimitService.resetAttempts(`ip:${ip}`)
    if (username) {
      await rateLimitService.resetAttempts(userIdentifier)
    }

    const isProduction = process.env.NODE_ENV === 'production'

    // Set Access Token Cookie (1 hour)
    setCookie(event, 'auth_token', accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 60 * 60, // 1 hour
      path: '/'
    })

    // Set Refresh Token Cookie
    setCookie(event, 'refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: parsed.rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24 * 7, // 30 days or 7 days
      path: '/'
    })

    // Non-blocking audit log
    logAudit(event, user.userId, 'LOGIN', 'Auth', `User ${user.username} logged in`)

    return successResponse({ user }, 'Login successful')
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      handleZodError(error) // Throws 422
    }

    // If it's an H3 error (like 401 Unauthorized, 403 Forbidden, 429 Too Many Requests), handle specifically
    if (error.statusCode) {
      // If it's an authentication failure (401 or 403), increment the rate limit counter
      if (error.statusCode === 401 || error.statusCode === 403) {
        const p = []
        p.push(rateLimitService.incrementAttempts(`ip:${ip}`).catch(e => console.error('Failed to increment IP rate limit', e)))
        if (username) {
          p.push(rateLimitService.incrementAttempts(`user:${username}`).catch(e => console.error('Failed to increment user rate limit', e)))
        }
        await Promise.all(p)
      }
      throw error
    }

    // Unhandled exception (e.g. database connection error)
    console.error('Unhandled login error:', error)
    throw createError({ statusCode: 500, message: 'An unexpected error occurred' })
  }
})
