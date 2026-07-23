
export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  await connectDB()

  logAudit(event, user.userId, 'LOGOUT', 'Auth', `User ${user.username} logged out`)

  try {
    const { User } = await import('../../models/User')
    const dbUser = await User.findById(user.userId)
    if (dbUser) {
      dbUser.refreshTokenHash = null
      await dbUser.save()
    }
  } catch (error) {
    console.error('Logout DB wipe error:', error)
  }

  deleteCookie(event, 'auth_token', { path: '/' })
  deleteCookie(event, 'refresh_token', { path: '/' })

  return successResponse(null, 'Logged out successfully')
})
