import fs from 'node:fs/promises'
import path from 'node:path'
import { requireRole } from '../../../utils/auth'
import { successResponse } from '../../../utils/response'
import { DAILY_DIR, MONTHLY_DIR, restoreDatabaseFromFile } from '../../../utils/backupService'

export default defineEventHandler(async (event) => {
  const authUser = requireRole(event, 'admin')
  const body = await readBody(event).catch(() => ({}))
  const type = body?.type || 'daily'

  let filePath = ''
  let filename = ''

  if (type === 'daily') {
    filename = 'efe-daily-backup.json'
    filePath = path.resolve(DAILY_DIR, filename)
  } else if (type === 'monthly') {
    const requested = (body?.filename as string) || ''
    const safeFilename = path.basename(requested)

    if (!safeFilename.startsWith('efe-monthly-') || !safeFilename.endsWith('.json')) {
      throw createError({
        statusCode: 400,
        message: 'Invalid monthly backup filename requested'
      })
    }

    filename = safeFilename
    filePath = path.resolve(MONTHLY_DIR, filename)
  } else {
    throw createError({
      statusCode: 400,
      message: 'Invalid backup type. Must be "daily" or "monthly"'
    })
  }

  try {
    await fs.access(filePath)
  } catch {
    throw createError({
      statusCode: 404,
      message: `Requested backup file (${filename}) does not exist on the server`
    })
  }

  try {
    const result = await restoreDatabaseFromFile(filePath, authUser.userId)
    return successResponse(
      result,
      `Successfully restored ${result.totalDocuments} records from ${filename}`
    )
  } catch (err: any) {
    throw createError({
      statusCode: 500,
      message: err.message || 'Failed to restore database from backup file'
    })
  }
})
