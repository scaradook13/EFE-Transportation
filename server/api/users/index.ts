import { userRepository } from '~~/server/repositories/userRepository'
import { z } from 'zod'

const createUserSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  fullName: z.string().min(2),
  role: z.enum(['admin', 'dispatcher', 'hr']),
  isActive: z.boolean().optional()
})

const updateUserSchema = z.object({
  fullName: z.string().min(2).optional(),
  role: z.enum(['admin', 'dispatcher', 'hr']).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(6).optional()
})

export default defineEventHandler(async (event) => {
  requireRole(event, 'admin')
  await connectDB()

  const method = getMethod(event)

  if (method === 'GET') {
    const query = getQuery(event)
    const page = Number(query.page) || 1
    const limit = Number(query.limit) || 10
    const result = await userRepository.findAll({
      role: query.role as 'admin' | 'dispatcher' | 'hr' | undefined,
      isActive: query.isActive !== undefined ? query.isActive === 'true' : undefined,
      search: query.search as string | undefined
    }, page, limit)

    return paginatedResponse(result.data, {
      total: result.total, page: result.page, limit: result.limit, pages: result.pages
    })
  }

  if (method === 'POST') {
    const body = await readBody(event)
    const parsed = createUserSchema.safeParse(body)
    if (!parsed.success) {
      throw createError({ statusCode: 400, message: parsed.error.errors[0]?.message || 'Validation failed' })
    }

    const existing = await userRepository.findByUsername(parsed.data.username)
    if (existing) {
      throw createError({ statusCode: 409, message: 'Username already exists' })
    }

    const user = await userRepository.create(parsed.data)
    return successResponse(user, 'User created successfully', 201)
  }

  throw createError({ statusCode: 405, message: 'Method not allowed' })
})
