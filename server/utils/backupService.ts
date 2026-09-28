import fs from 'node:fs/promises'
import path from 'node:path'
import mongoose from 'mongoose'
import { connectDB } from './database'
import { User } from '../models/User'
import { AuditLog } from '../models/AuditLog'

export const BACKUPS_ROOT = path.resolve(process.cwd(), 'backups')
export const DAILY_DIR = path.resolve(BACKUPS_ROOT, 'daily')
export const MONTHLY_DIR = path.resolve(BACKUPS_ROOT, 'monthly')

export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

export async function ensureBackupDirs() {
  await fs.mkdir(DAILY_DIR, { recursive: true })
  await fs.mkdir(MONTHLY_DIR, { recursive: true })
}

export async function writeAtomicFile(targetPath: string, content: string) {
  const tempPath = `${targetPath}.tmp`
  await fs.writeFile(tempPath, content, 'utf-8')
  try {
    await fs.rename(tempPath, targetPath)
  } catch {
    // Windows fallback if rename encounters temporary file locks
    await fs.copyFile(tempPath, targetPath)
    await fs.unlink(tempPath).catch(() => {})
  }
}

async function logBackupAudit(action: string, details: string, userId?: string) {
  try {
    let resolvedUserId = userId
    if (!resolvedUserId) {
      const admin = await User.findOne({ role: 'admin' }).select('_id').lean()
      resolvedUserId = admin?._id?.toString()
    }
    if (resolvedUserId) {
      await AuditLog.create({
        user: resolvedUserId,
        action,
        module: 'Backup & Restore',
        details,
        ipAddress: '127.0.0.1 (System)',
        browser: 'EFE Automated Backup Service'
      })
    }
  } catch (err) {
    console.error('Failed to log backup audit:', err)
  }
}

export async function generateSnapshotPayload(exportedBy = 'Automated Background Service') {
  await connectDB()
  const db = mongoose.connection.db
  if (!db) {
    throw new Error('Database connection failed')
  }

  const rawCollections = await db.listCollections().toArray()
  const filtered = rawCollections
    .map(c => c.name)
    .filter(name => !name.startsWith('system.'))
    .sort()

  const collectionsData: Record<string, any[]> = {}
  const summary: Record<string, number> = {}

  for (const name of filtered) {
    const docs = await db.collection(name).find({}).toArray()
    collectionsData[name] = docs
    summary[name] = docs.length
  }

  const totalDocuments = Object.values(summary).reduce((a, b) => a + b, 0)
  const now = new Date()

  const payload = {
    _efe_backup_meta: {
      system: 'EFE Taxi Dispatch System',
      version: '1.0.0',
      exportedAt: now.toISOString(),
      exportedBy,
      totalCollections: filtered.length,
      totalDocuments,
      collectionsSummary: summary
    },
    collections: collectionsData
  }

  const { EJSON } = mongoose.mongo.BSON
  const jsonContent = EJSON.stringify(payload, { relaxed: false }, 2)

  return {
    jsonContent,
    totalDocuments,
    totalCollections: filtered.length,
    summary,
    now
  }
}

export async function runDailyBackup(reason = 'Scheduled 24h Daily Run', triggeredBy?: string) {
  await ensureBackupDirs()
  const { jsonContent, totalDocuments, totalCollections } = await generateSnapshotPayload(
    triggeredBy ? `Admin (${triggeredBy})` : 'Automated Daily Service'
  )

  const targetPath = path.resolve(DAILY_DIR, 'efe-daily-backup.json')
  await writeAtomicFile(targetPath, jsonContent)

  const stats = await fs.stat(targetPath)
  const sizeFormatted = formatBytes(stats.size)

  await logBackupAudit(
    'AUTO_BACKUP_DAILY',
    `Updated 24h Daily Backup (efe-daily-backup.json, ${totalDocuments} docs, ${sizeFormatted}). Reason: ${reason}`,
    triggeredBy
  )

  return {
    success: true,
    filename: 'efe-daily-backup.json',
    totalDocuments,
    totalCollections,
    sizeBytes: stats.size,
    sizeFormatted,
    updatedAt: stats.mtime.toISOString()
  }
}

export async function runMonthlyBackup(reason = 'Monthly Archive', triggeredBy?: string) {
  await ensureBackupDirs()
  const now = new Date()
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const filename = `efe-monthly-${yearMonth}.json`
  const targetPath = path.resolve(MONTHLY_DIR, filename)

  const { jsonContent, totalDocuments, totalCollections } = await generateSnapshotPayload(
    triggeredBy ? `Admin (${triggeredBy})` : 'Automated Monthly Service'
  )

  await writeAtomicFile(targetPath, jsonContent)

  const stats = await fs.stat(targetPath)
  const sizeFormatted = formatBytes(stats.size)

  await logBackupAudit(
    'AUTO_BACKUP_MONTHLY',
    `Created Monthly Archive (${filename}, ${totalDocuments} docs, ${sizeFormatted}). Reason: ${reason}`,
    triggeredBy
  )

  return {
    success: true,
    filename,
    month: yearMonth,
    totalDocuments,
    totalCollections,
    sizeBytes: stats.size,
    sizeFormatted,
    createdAt: stats.mtime.toISOString()
  }
}

export async function checkAndRunScheduledBackups() {
  await ensureBackupDirs()
  const now = new Date()
  const dailyPath = path.resolve(DAILY_DIR, 'efe-daily-backup.json')

  // 1. Daily Check
  let needsDaily = false
  let dailyReason = ''

  try {
    const dailyStat = await fs.stat(dailyPath)
    const hoursSinceLastBackup = (now.getTime() - dailyStat.mtime.getTime()) / (1000 * 60 * 60)

    if (hoursSinceLastBackup >= 24) {
      needsDaily = true
      dailyReason = `Overdue Catch-Up (${hoursSinceLastBackup.toFixed(1)}h since last backup)`
    } else {
      const lastDate = dailyStat.mtime.toISOString().slice(0, 10)
      const currentDate = now.toISOString().slice(0, 10)
      if (lastDate !== currentDate && now.getHours() >= 2) {
        needsDaily = true
        dailyReason = 'Scheduled 2:00 AM Daily Run'
      }
    }
  } catch {
    needsDaily = true
    dailyReason = 'Initial Setup / First Day Backup'
  }

  if (needsDaily) {
    try {
      console.log(`[BackupScheduler] Triggering Daily Backup: ${dailyReason}`)
      await runDailyBackup(dailyReason)
      console.log('[BackupScheduler] ✅ Daily Backup updated successfully.')
    } catch (err: any) {
      console.error('[BackupScheduler] ❌ Error running Daily Backup:', err.message)
    }
  }

  // 2. Monthly Check
  const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const monthlyPath = path.resolve(MONTHLY_DIR, `efe-monthly-${currentYearMonth}.json`)

  let needsMonthly = false
  try {
    await fs.stat(monthlyPath)
  } catch {
    needsMonthly = true
  }

  if (needsMonthly) {
    try {
      console.log(`[BackupScheduler] Triggering Monthly Archive for ${currentYearMonth}`)
      await runMonthlyBackup(`Monthly Archive for ${currentYearMonth}`)
      console.log(`[BackupScheduler] ✅ Monthly Archive for ${currentYearMonth} created.`)
    } catch (err: any) {
      console.error('[BackupScheduler] ❌ Error running Monthly Backup:', err.message)
    }
  }
}

function parseMetaFromContent(raw: string) {
  try {
    const parsed = JSON.parse(raw)
    return parsed._efe_backup_meta || null
  } catch {
    return null
  }
}

export async function getAutomatedBackupStatus() {
  await ensureBackupDirs()
  const dailyPath = path.resolve(DAILY_DIR, 'efe-daily-backup.json')

  let dailyInfo: any = {
    exists: false,
    filename: 'efe-daily-backup.json',
    sizeBytes: 0,
    sizeFormatted: '0 Bytes',
    lastModified: null,
    totalDocuments: 0,
    totalCollections: 0,
    nextSchedule: 'Every 24 hours (with Auto Startup Catch-up)'
  }

  try {
    const dailyStat = await fs.stat(dailyPath)
    const content = await fs.readFile(dailyPath, 'utf-8')
    const meta = parseMetaFromContent(content)

    dailyInfo = {
      exists: true,
      filename: 'efe-daily-backup.json',
      sizeBytes: dailyStat.size,
      sizeFormatted: formatBytes(dailyStat.size),
      lastModified: dailyStat.mtime.toISOString(),
      totalDocuments: meta?.totalDocuments ?? 0,
      totalCollections: meta?.totalCollections ?? 0,
      exportedAt: meta?.exportedAt ?? dailyStat.mtime.toISOString(),
      nextSchedule: 'Every 24 hours (with Auto Startup Catch-up)'
    }
  } catch {
    // File does not exist yet
  }

  const monthlyList: any[] = []
  try {
    const files = await fs.readdir(MONTHLY_DIR)
    const jsonFiles = files.filter(f => f.startsWith('efe-monthly-') && f.endsWith('.json'))

    for (const file of jsonFiles) {
      const filePath = path.resolve(MONTHLY_DIR, file)
      const stat = await fs.stat(filePath)
      const content = await fs.readFile(filePath, 'utf-8')
      const meta = parseMetaFromContent(content)

      const monthMatch = file.match(/efe-monthly-(\d{4}-\d{2})\.json/)
      const monthKey = (monthMatch && monthMatch[1]) ? monthMatch[1] : 'Unknown'

      let monthLabel = monthKey
      if (monthMatch && monthMatch[1]) {
        const parts = monthMatch[1].split('-')
        const year = parseInt(parts[0] || '2026', 10)
        const month = parseInt(parts[1] || '1', 10)
        const dateObj = new Date(year, month - 1, 1)
        monthLabel = dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      }

      monthlyList.push({
        filename: file,
        monthKey,
        monthLabel,
        sizeBytes: stat.size,
        sizeFormatted: formatBytes(stat.size),
        createdAt: stat.mtime.toISOString(),
        totalDocuments: meta?.totalDocuments ?? 0,
        totalCollections: meta?.totalCollections ?? 0,
        exportedAt: meta?.exportedAt ?? stat.mtime.toISOString()
      })
    }

    // Sort descending (latest month first)
    monthlyList.sort((a, b) => b.monthKey.localeCompare(a.monthKey))
  } catch (err) {
    console.error('Error reading monthly backups:', err)
  }

  return {
    daily: dailyInfo,
    monthly: monthlyList
  }
}

export async function restoreDatabaseFromFile(filePath: string, authUserId: string) {
  await connectDB()
  const db = mongoose.connection.db
  if (!db) {
    throw new Error('Database connection failed')
  }

  const jsonString = await fs.readFile(filePath, 'utf-8')
  const { EJSON } = mongoose.mongo.BSON
  const parsed = EJSON.parse(jsonString) as any

  let collectionsMap: Record<string, any[]> = {}
  if (parsed && typeof parsed === 'object') {
    if (parsed.collections && typeof parsed.collections === 'object') {
      collectionsMap = parsed.collections
    } else if (parsed.data && typeof parsed.data === 'object') {
      collectionsMap = parsed.data
    } else {
      for (const [key, val] of Object.entries(parsed)) {
        if (!key.startsWith('_') && key !== 'meta' && Array.isArray(val)) {
          collectionsMap[key] = val
        }
      }
    }
  }

  const collectionNames = Object.keys(collectionsMap)
  if (collectionNames.length === 0) {
    throw new Error('No collections found in backup file')
  }

  const restoredSummary: Record<string, number> = {}
  let totalRestored = 0

  for (const name of collectionNames) {
    const docs = collectionsMap[name]
    if (!Array.isArray(docs)) continue

    await db.collection(name).deleteMany({})
    if (docs.length > 0) {
      await db.collection(name).insertMany(docs, { ordered: false })
    }
    restoredSummary[name] = docs.length
    totalRestored += docs.length
  }

  const filename = path.basename(filePath)
  await logBackupAudit(
    'BACKUP_RESTORE',
    `Restored database from ${filename} (${totalRestored} docs across ${collectionNames.length} collections)`,
    authUserId
  )

  return {
    totalDocuments: totalRestored,
    totalCollections: collectionNames.length,
    collections: restoredSummary
  }
}
