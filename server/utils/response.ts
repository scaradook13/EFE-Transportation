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
