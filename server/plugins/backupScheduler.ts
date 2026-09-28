import { checkAndRunScheduledBackups } from '../utils/backupService'

export default defineNitroPlugin(async (_nitroApp) => {
  // Give Nitro and MongoDB 5 seconds to finish initial startup before running catch-up checks
  setTimeout(async () => {
    try {
      console.log('🔄 [BackupScheduler] Initializing automated backup service...')
      await checkAndRunScheduledBackups()
    } catch (err: any) {
      console.warn('⚠️ [BackupScheduler] Startup backup check notice:', err.message)
    }
  }, 5000)

  // Run a periodic check every 30 minutes to evaluate if 24 hours have passed or if 2:00 AM has arrived
  const INTERVAL_MS = 30 * 60 * 1000
  setInterval(async () => {
    try {
      await checkAndRunScheduledBackups()
    } catch (err: any) {
      console.warn('⚠️ [BackupScheduler] Periodic backup check notice:', err.message)
    }
  }, INTERVAL_MS)
})
