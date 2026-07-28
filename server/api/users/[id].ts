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

  if (method === 'DELETE') {
    const targetUser = await userRepository.findById(id)
    if (!targetUser) throw createError({ statusCode: 404, message: 'User not found' })

    const authUser = requireRole(event, 'admin')

    if (targetUser.isPrimaryAdmin) {
      logAudit(event, authUser.userId, 'DELETE_USER_BLOCKED', 'User Management', `Attempted to delete primary admin: ${targetUser.username}`)
      setResponseStatus(event, 403)
      return { success: false, message: 'The primary administrator account cannot be deleted.' }
    }

    await userRepository.remove(id)
    logAudit(event, authUser.userId, 'DELETE_USER', 'User Management', `Deleted user: ${targetUser.username}`)
    return successResponse(null, 'User deleted successfully')
  }

  throw createError({ statusCode: 405, message: 'Method not allowed' })
})
