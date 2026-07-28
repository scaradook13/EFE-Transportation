import mongoose from 'mongoose'

export default defineEventHandler(async (event) => {
  const id = event.context.params?.id

  if (!id || !mongoose.isValidObjectId(id)) {
    throw createError({ statusCode: 400, message: 'Invalid photo ID' })
  }

  if (mongoose.connection.readyState !== 1) {
    throw createError({ statusCode: 500, message: 'Database connection not ready' })
  }

  const db = mongoose.connection.db
  if (!db) {
    throw createError({ statusCode: 500, message: 'Database connection failed' })
  }

  const bucket = new mongoose.mongo.GridFSBucket(db, {
    bucketName: 'photos'
  })

  try {
    const objectId = new mongoose.Types.ObjectId(id)
    const files = await bucket.find({ _id: objectId }).toArray()

    if (!files || files.length === 0) {
      throw createError({ statusCode: 404, message: 'Photo not found' })
    }

    const file = files[0]

    // Set headers
    setResponseHeader(event, 'Content-Type', file.contentType || 'image/jpeg')
    setResponseHeader(event, 'Content-Length', file.length.toString())
    setResponseHeader(event, 'Cache-Control', 'public, max-age=31536000, immutable') // Cache for 1 year

    // Open download stream and pipe to response
    const downloadStream = bucket.openDownloadStream(objectId)

    return sendStream(event, downloadStream)
  } catch (err: any) {
    if (err.statusCode) throw err
    throw createError({ statusCode: 500, message: 'Failed to retrieve photo' })
  }
})
