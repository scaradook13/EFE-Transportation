import { requireRole } from '../../../utils/auth'
import { successResponse } from '../../../utils/response'
import { runDailyBackup, runMonthlyBackup, getAutomatedBackupStatus } from '../../../utils/backupService'

export default defineEventHandler(async (event) => {
  const authUser = requireRole(event, 'admin')
  const body = await readBody(event).catch(() => ({}))
  const type = body?.type || 'daily' // 'daily' | 'monthly' | 'both'

  try {
    const results: any = {}

    if (type === 'daily' || type === 'both') {
      results.daily = await runDailyBackup('Manual Admin Trigger from Dashboard', authUser.userId)
    }

    if (type === 'monthly' || type === 'both') {
      results.monthly = await runMonthlyBackup('Manual Admin Trigger from Dashboard', authUser.userId)
    }

    const updatedStatus = await getAutomatedBackupStatus()

    return successResponse({
      results,
      status: updatedStatus
    }, `Automated backup (${type}) executed successfully`)
  } catch (err: any) {
    throw createError({
      statusCode: 500,
      message: err.message || 'Failed to execute automated backup'
    })
  }
})
