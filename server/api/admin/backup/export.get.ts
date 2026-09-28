import mongoose from 'mongoose'
import { requireRole } from '../../../utils/auth'
import { connectDB } from '../../../utils/database'
import { logAudit } from '../../../utils/auditLogger'

export default defineEventHandler(async (event) => {
  const authUser = requireRole(event, 'admin')
  await connectDB()

  const db = mongoose.connection.db
  if (!db) {
    throw createError({ statusCode: 500, message: 'Database connection failed' })
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
  const dateStr = now.toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const filename = `efe-backup-${dateStr}.json`

  const payload = {
    _efe_backup_meta: {
      system: 'EFE Taxi Dispatch System',
      version: '1.0.0',
      exportedAt: now.toISOString(),
      exportedBy: authUser.username,
      totalCollections: filtered.length,
      totalDocuments,
      collectionsSummary: summary
    },
    collections: collectionsData
  }

  // Use BSON Extended JSON to preserve ObjectIds, Dates, and Binary GridFS buffers losslessly
  const { EJSON } = mongoose.mongo.BSON
  const jsonContent = EJSON.stringify(payload, { relaxed: false }, 2)

  setHeader(event, 'Content-Type', 'application/json; charset=utf-8')
  setHeader(event, 'Content-Disposition', `attachment; filename="${filename}"`)

  await logAudit(
    event,
    authUser.userId,
    'BACKUP_EXPORT',
    'Backup & Restore',
    `Exported full database backup (${totalDocuments} documents across ${filtered.length} collections)`
  )

  return jsonContent
})
