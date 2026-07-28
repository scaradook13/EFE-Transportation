import { userRepository } from '~~/server/repositories/userRepository'
import { userSchema } from '~~/shared/utils/validations'
import { handleZodError } from '~~/server/utils/response'

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
    try {
      const body = await readBody(event)
      const parsed = await userSchema.parseAsync(body)
  
      const existing = await userRepository.findByUsername(parsed.username)
      if (existing) {
        throw createError({ statusCode: 422, statusMessage: 'Unprocessable Entity', message: 'Validation failed', data: { errors: { username: 'Username already exists.' } } })
      }
  
      const user = await userRepository.create(parsed)
      return successResponse(user, 'User created successfully', 201)
    } catch (err) {
      handleZodError(err)
    }
  }

  throw createError({ statusCode: 405, message: 'Method not allowed' })
})
