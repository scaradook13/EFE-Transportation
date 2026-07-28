import { authService } from '../../services/authService'
import { loginSchema } from '~~/shared/utils/validations'
import { handleZodError } from '~~/server/utils/response'
import { z } from 'zod'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    
    // Validate request
    const parsed = await loginSchema.extend({ rememberMe: z.boolean().optional().default(false) }).parseAsync(body)

    const { accessToken, refreshToken, user } = await authService.login(parsed)

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
  } catch (error: unknown) {
    handleZodError(error)
    throw createError({ statusCode: 500, message: 'Login failed' })
  }
})
