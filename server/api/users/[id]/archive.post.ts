import { userRepository } from '~~/server/repositories/userRepository'

/**
 * Archive a user account — Admin only.
 * The account is hidden from the Users list, signed out immediately, and cannot log in
 * until an admin restores it from the Archives tab.
 */
export default defineEventHandler(async (event) => {
  const authUser = requireRole(event, 'admin')
  await connectDB()
  const id = getRouterParam(event, 'id')!

  const targetUser = await userRepository.findById(id)
  if (!targetUser) throw createError({ statusCode: 404, message: 'User not found' })

  if (targetUser.isPrimaryAdmin) {
    logAudit(event, authUser.userId, 'ARCHIVE_USER_BLOCKED', 'User Management', `Attempted to archive primary admin: ${targetUser.username}`)
    setResponseStatus(event, 403)
    return { success: false, message: 'The primary administrator account cannot be archived.' }
  }

  if (targetUser._id.toString() === authUser.userId) {
    setResponseStatus(event, 403)
    return { success: false, message: 'You cannot archive your own account.' }
  }

  if (targetUser.isArchived) {
    setResponseStatus(event, 409)
    return { success: false, message: 'This user is already archived.' }
  }

  await userRepository.archive(id, authUser.userId)

  logAudit(event, authUser.userId, 'ARCHIVE_USER', 'User Management', `Archived user: ${targetUser.fullName} (${targetUser.username})`)

  return successResponse(null, 'User archived successfully')
})
