import { dispatchService, updateDispatchSchema } from '~~/server/services/dispatchService'

export default defineEventHandler(async (event) => {
  const authUser = requireAuth(event)
  await connectDB()
  const id = getRouterParam(event, 'id')!

  const body = await readBody(event)
  const parsed = updateDispatchSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: parsed.error.errors[0]?.message || 'Validation failed'
    })
  }

  const dispatch = await dispatchService.update(id, parsed.data)

  logAudit(
    event,
    authUser.userId,
    'UPDATE_DISPATCH',
    'Dispatches',
    `Updated dispatch status to: ${parsed.data.status}`
  )

  return successResponse(dispatch, 'Dispatch updated successfully')
})
