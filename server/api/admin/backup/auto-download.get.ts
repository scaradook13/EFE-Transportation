import fs from 'node:fs/promises'
import path from 'node:path'
import { requireRole } from '../../../utils/auth'
import { DAILY_DIR, MONTHLY_DIR } from '../../../utils/backupService'

export default defineEventHandler(async (event) => {
  requireRole(event, 'admin')
  const query = getQuery(event)
  const type = (query.type as string) || 'daily'

  let filePath = ''
  let filename = ''

  if (type === 'daily') {
    filename = 'efe-daily-backup.json'
    filePath = path.resolve(DAILY_DIR, filename)
  } else if (type === 'monthly') {
    const requested = (query.filename as string) || ''
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

  const content = await fs.readFile(filePath, 'utf-8')

  setHeader(event, 'Content-Type', 'application/json; charset=utf-8')
  setHeader(event, 'Content-Disposition', `attachment; filename="${filename}"`)

  return content
})
