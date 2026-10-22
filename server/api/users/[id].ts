import { userRepository } from '~~/server/repositories/userRepository'
import { logAudit } from '~~/server/utils/auditLogger'
import { userEditSchema } from '~~/shared/utils/validations'
import { handleZodError } from '~~/server/utils/response'

export default defineEventHandler(async (event) => {
  requireRole(event, 'admin')
  await connectDB()
  const id = getRouterParam(event, 'id')!
  const method = getMethod(event)

  if (method === 'PUT' || method === 'PATCH') {
    const targetUser = await userRepository.findById(id)
    if (!targetUser) throw createError({ statusCode: 404, message: 'User not found' })

    const authUser = requireRole(event, 'admin')

    if (targetUser.isPrimaryAdmin && targetUser._id.toString() !== authUser.userId) {
      logAudit(event, authUser.userId, 'EDIT_USER_BLOCKED', 'User Management', `Attempted to edit primary admin: ${targetUser.username}`)
      setResponseStatus(event, 403)
      return { success: false, message: 'The Primary Administrator account is protected and cannot be edited.' }
    }

    if (targetUser.isArchived) {
      setResponseStatus(event, 409)
      return { success: false, message: 'This user is archived. Restore the account from the Archives tab before editing.' }
    }

    try {
      const body = await readBody(event)
      
      // Need to partially accept updates for full/partial fields based on edit form
      const parsed = await userEditSchema.partial().parseAsync(body)
      
      if (parsed.password === '') {
        delete parsed.password
      }
      
      const updatedUser = await userRepository.update(id, parsed)
  
      if (targetUser.isPrimaryAdmin && targetUser._id.toString() === authUser.userId) {
         logAudit(event, authUser.userId, 'EDIT_PRIMARY_ADMIN', 'User Management', `Primary admin updated own account`)
      } else {
         logAudit(event, authUser.userId, 'EDIT_USER', 'User Management', `Updated user: ${targetUser.username}`)
      }
  
      return successResponse(updatedUser, 'User updated successfully')
    } catch (err) {
      handleZodError(err)
    }
  }

  // Permanent delete — only from the Archives tab, only for archived users
  if (method === 'DELETE') {
    const targetUser = await userRepository.findById(id)
    if (!targetUser) throw createError({ statusCode: 404, message: 'User not found' })

    const authUser = requireRole(event, 'admin')

    if (targetUser.isPrimaryAdmin) {
      logAudit(event, authUser.userId, 'PERMANENT_DELETE_USER_BLOCKED', 'Archives', `Attempted to delete primary admin: ${targetUser.username}`)
      setResponseStatus(event, 403)
      return { success: false, message: 'The primary administrator account cannot be deleted.' }
    }

    if (targetUser._id.toString() === authUser.userId) {
      setResponseStatus(event, 403)
      return { success: false, message: 'You cannot delete your own account.' }
    }

    if (!targetUser.isArchived) {
      setResponseStatus(event, 409)
      return { success: false, message: 'Only archived users can be permanently deleted. Archive the user first.' }
    }

    await userRepository.remove(id)
    logAudit(event, authUser.userId, 'PERMANENT_DELETE_USER', 'Archives', `Permanently deleted user: ${targetUser.fullName} (${targetUser.username})`)
    return successResponse(null, 'User permanently deleted')
  }

  throw createError({ statusCode: 405, message: 'Method not allowed' })
})
