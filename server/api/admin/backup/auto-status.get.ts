import { requireRole } from '../../../utils/auth'
import { successResponse } from '../../../utils/response'
import { getAutomatedBackupStatus } from '../../../utils/backupService'

export default defineEventHandler(async (event) => {
  requireRole(event, 'admin')

  try {
    const status = await getAutomatedBackupStatus()
    return successResponse(status, 'Automated backup status retrieved successfully')
  } catch (err: any) {
    throw createError({
      statusCode: 500,
      message: err.message || 'Failed to retrieve automated backup status'
    })
  }
})
