import { userRepository } from '~~/server/repositories/userRepository'
import { z } from 'zod'

const updateUserSchema = z.object({
  fullName: z.string().min(2).optional(),
  role: z.enum(['admin', 'dispatcher', 'hr']).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(6).optional()
})

export default defineEventHandler(async (event) => {
  requireRole(event, 'admin')
  await connectDB()
  const id = getRouterParam(event, 'id')!
  const method = getMethod(event)

  if (method === 'PUT' || method === 'PATCH') {
    const body = await readBody(event)
    const parsed = updateUserSchema.safeParse(body)
    if (!parsed.success) {
      throw createError({ statusCode: 400, message: parsed.error.errors[0]?.message || 'Validation failed' })
    }
    const user = await userRepository.update(id, parsed.data)
    if (!user) throw createError({ statusCode: 404, message: 'User not found' })
    return successResponse(user, 'User updated successfully')
  }

  if (method === 'DELETE') {
    const user = await userRepository.remove(id)
    if (!user) throw createError({ statusCode: 404, message: 'User not found' })
    return successResponse(null, 'User deleted successfully')
  }

  throw createError({ statusCode: 405, message: 'Method not allowed' })
})
