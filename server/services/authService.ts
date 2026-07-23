import argon2 from 'argon2'
import { userRepository } from '~~/server/repositories/userRepository'

export interface LoginDto {
  username: string
  password: string
  rememberMe?: boolean
}

export interface JwtPayload {
  userId: string
  username: string
  role: string
  fullName: string
}

export const authService = {
  async login(dto: LoginDto) {
    await connectDB()

    const user = await userRepository.findByUsername(dto.username)

    if (!user) {
      throw createError({ statusCode: 401, message: 'Invalid username or password' })
    }

    if (!user.isActive) {
      throw createError({ statusCode: 403, message: 'Account is deactivated. Contact administrator.' })
    }

    const isPasswordValid = await user.comparePassword(dto.password)
    if (!isPasswordValid) {
      throw createError({ statusCode: 401, message: 'Invalid username or password' })
    }

    const payload: JwtPayload = {
      userId: user._id.toString(),
      username: user.username,
      role: user.role,
      fullName: user.fullName
    }

    const { accessToken, refreshToken } = generateTokens(payload, dto.rememberMe)

    // Hash refresh token and save to DB
    const refreshTokenHash = await argon2.hash(refreshToken)
    user.refreshTokenHash = refreshTokenHash
    user.lastLogin = new Date()
    user.lastActivity = new Date()
    await user.save()

    return { accessToken, refreshToken, user: { ...payload, isActive: user.isActive } }
  }


}
