import mongoose from 'mongoose'
import { requireRole } from '../../../utils/auth'
import { connectDB } from '../../../utils/database'
import { successResponse } from '../../../utils/response'

export default defineEventHandler(async (event) => {
  requireRole(event, 'admin')
  await connectDB()

  const db = mongoose.connection.db
  if (!db) {
    throw createError({ statusCode: 500, message: 'Database connection failed' })
  }

  const rawCollections = await db.listCollections().toArray()
  const filtered = rawCollections.filter(c => !c.name.startsWith('system.'))

  const collectionStats = await Promise.all(
    filtered.map(async (c) => {
      const count = await db.collection(c.name).countDocuments({})
      return {
        name: c.name,
        count
      }
    })
  )

  // Sort alphabetically by name
  collectionStats.sort((a, b) => a.name.localeCompare(b.name))

  const totalDocuments = collectionStats.reduce((sum, c) => sum + c.count, 0)

  return successResponse({
    databaseName: db.databaseName,
    totalCollections: collectionStats.length,
    totalDocuments,
    collections: collectionStats
  }, 'Database stats retrieved')
})
