import mongoose from 'mongoose'
import { requireRole } from '../../../utils/auth'
import { connectDB } from '../../../utils/database'
import { logAudit } from '../../../utils/auditLogger'
import { successResponse } from '../../../utils/response'

export default defineEventHandler(async (event) => {
  const authUser = requireRole(event, 'admin')
  await connectDB()

  const db = mongoose.connection.db
  if (!db) {
    throw createError({ statusCode: 500, message: 'Database connection failed' })
  }

  let jsonString = ''

  // 1. Check for multipart form upload (file attachment)
  try {
    const formData = await readMultipartFormData(event)
    if (formData && formData.length > 0) {
      const filePart = formData.find(f => f.name === 'backup' || f.name === 'file' || f.filename?.endsWith('.json'))
      if (filePart && filePart.data) {
        jsonString = filePart.data.toString('utf-8')
      }
    }
  } catch {
    // Not multipart, fall through to raw body
  }

  // 2. If not multipart, check raw text/json body
  if (!jsonString) {
    const raw = await readRawBody(event, 'utf-8')
    if (raw && typeof raw === 'string') {
      jsonString = raw
    }
  }

  if (!jsonString || jsonString.trim().length === 0) {
    throw createError({
      statusCode: 400,
      message: 'No backup data provided. Please upload a valid JSON backup file.'
    })
  }

  // 3. Deserialize with MongoDB Extended JSON (EJSON) to restore BSON types
  const { EJSON } = mongoose.mongo.BSON
  let parsed: any

  try {
    parsed = EJSON.parse(jsonString)
  } catch (err: any) {
    throw createError({
      statusCode: 400,
      message: `Invalid JSON format: ${err.message || 'Syntax error'}`
    })
  }

  // 4. Extract collections object
  let collectionsMap: Record<string, any[]> = {}

  if (parsed && typeof parsed === 'object') {
    if (parsed.collections && typeof parsed.collections === 'object') {
      collectionsMap = parsed.collections
    } else if (parsed.data && typeof parsed.data === 'object') {
      collectionsMap = parsed.data
    } else {
      // Top-level object where keys are collection names
      for (const [key, val] of Object.entries(parsed)) {
        if (!key.startsWith('_') && key !== 'meta' && Array.isArray(val)) {
          collectionsMap[key] = val
        }
      }
    }
  }

  const collectionNames = Object.keys(collectionsMap)
  if (collectionNames.length === 0) {
    throw createError({
      statusCode: 400,
      message: 'No collections found in the backup file. Please verify the file structure.'
    })
  }

  // 5. Restore each collection
  const restoredSummary: Record<string, number> = {}
  let totalRestored = 0

  for (const name of collectionNames) {
    const docs = collectionsMap[name]
    if (!Array.isArray(docs)) continue

    // Wipe existing collection clean
    await db.collection(name).deleteMany({})

    // Insert backup documents if any exist
    if (docs.length > 0) {
      await db.collection(name).insertMany(docs, { ordered: false })
    }

    restoredSummary[name] = docs.length
    totalRestored += docs.length
  }

  // 6. Log audit action
  await logAudit(
    event,
    authUser.userId,
    'BACKUP_RESTORE',
    'Backup & Restore',
    `Restored database from backup (${totalRestored} documents across ${Object.keys(restoredSummary).length} collections)`
  )

  return successResponse({
    totalDocuments: totalRestored,
    totalCollections: Object.keys(restoredSummary).length,
    collections: restoredSummary
  }, `Successfully restored ${totalRestored} documents across ${Object.keys(restoredSummary).length} collections`)
})
