import { authService } from '../../services/authService'
import { z } from 'zod'

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional().default(false)
})

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const parsed = loginSchema.safeParse(body)

    if (!parsed.success) {
      throw createError({
        statusCode: 400,
        message: parsed.error.errors[0]?.message || 'Validation failed'
      })
    }

    const { accessToken, refreshToken, user } = await authService.login(parsed.data)

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
      maxAge: parsed.data.rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24 * 7, // 30 days or 7 days
      path: '/'
    })

    // Non-blocking audit log
    logAudit(event, user.userId, 'LOGIN', 'Auth', `User ${user.username} logged in`)

    return successResponse({ user }, 'Login successful')
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) throw error
    throw createError({ statusCode: 500, message: 'Login failed' })
  }
})
