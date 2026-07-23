import { dispatchService, createDispatchSchema } from '../../services/dispatchService'

export default defineEventHandler(async (event) => {
  const authUser = requireAuth(event)
  await connectDB()

  const body = await readBody(event)
  const parsed = createDispatchSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: parsed.error.errors[0]?.message || 'Validation failed',
      data: parsed.error.flatten()
    })
  }

  const dispatch = await dispatchService.create(parsed.data, authUser.userId)

  logAudit(
    event,
    authUser.userId,
    'CREATE_DISPATCH',
    'Dispatches',
    `Created dispatch: ${(dispatch as { dispatchNumber?: string })?.dispatchNumber} for ${parsed.data.passengerName}`
  )

  return successResponse(dispatch, 'Dispatch created successfully', 201)
})
