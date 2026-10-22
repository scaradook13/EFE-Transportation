import { userRepository } from '~~/server/repositories/userRepository'

/**
 * Restore (unarchive) a user account — Admin only.
 * The account reappears on the Users list and can sign in again.
 */
export default defineEventHandler(async (event) => {
  const authUser = requireRole(event, 'admin')
  await connectDB()
  const id = getRouterParam(event, 'id')!

  const targetUser = await userRepository.findById(id)
  if (!targetUser) throw createError({ statusCode: 404, message: 'User not found' })

  if (!targetUser.isArchived) {
    setResponseStatus(event, 409)
    return { success: false, message: 'This user is not archived.' }
  }

  await userRepository.restore(id)

  logAudit(event, authUser.userId, 'RESTORE_USER', 'Archives', `Restored user: ${targetUser.fullName} (${targetUser.username})`)

  return successResponse(null, 'User restored successfully')
})
