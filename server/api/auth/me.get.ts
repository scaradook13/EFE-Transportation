
export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  await connectDB()

  // Asynchronously update lastActivity without blocking the response
  import('../../models/User').then(async ({ User }) => {
    try {
      await User.findByIdAndUpdate(user.userId, { lastActivity: new Date() })
    } catch {}
  })

  return successResponse({ user }, 'Authenticated')
})
