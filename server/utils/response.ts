import { z } from 'zod'
import { createError } from 'h3'

export const successResponse = (data: unknown, message = 'Success', statusCode = 200) => {
  return {
    success: true,
    statusCode,
    message,
    data
  }
}

export const paginatedResponse = (
  data: unknown[],
  pagination: { total: number; page: number; limit: number; pages: number },
  message = 'Success'
) => {
  return {
    success: true,
    message,
    data,
    pagination
  }
}

export const errorResponse = (message: string, statusCode = 500, details?: unknown) => {
  return {
    success: false,
    statusCode,
    message,
    ...(details && { details })
  }
}

export const handleZodError = (error: unknown) => {
  if (error instanceof z.ZodError) {
    const errors: Record<string, string> = {}
    for (const issue of error.errors) {
      errors[issue.path.join('.')] = issue.message
    }
    throw createError({
      statusCode: 422,
      statusMessage: 'Unprocessable Entity',
      message: 'Validation failed',
      data: { errors } // Client reads err.data.data.errors
    })
  }
  throw error
}
