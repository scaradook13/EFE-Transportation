import mongoose from 'mongoose'
import { v4 as uuidv4 } from 'uuid'

export default defineEventHandler(async (event) => {
  requireAuth(event)

  const formData = await readMultipartFormData(event)

  if (!formData || formData.length === 0) {
    throw createError({ statusCode: 400, message: 'No file uploaded' })
  }

  const file = formData.find(f => f.name === 'photo')

  if (!file) {
    throw createError({ statusCode: 400, message: 'Photo field is required' })
  }

  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type || '')) {
    throw createError({ statusCode: 400, message: 'Only JPEG, PNG, and WebP images are allowed' })
  }

  const maxSize = 5 * 1024 * 1024 // 5MB
  if (file.data.length > maxSize) {
    throw createError({ statusCode: 400, message: 'File size must not exceed 5MB' })
  }

  if (mongoose.connection.readyState !== 1) {
    throw createError({ statusCode: 500, message: 'Database connection not ready' })
  }

  const ext = (file.type || 'image/jpeg').split('/')[1]
  const filename = `driver-${uuidv4()}.${ext}`

  const db = mongoose.connection.db
  if (!db) {
    throw createError({ statusCode: 500, message: 'Database connection failed' })
  }

  const bucket = new mongoose.mongo.GridFSBucket(db, {
    bucketName: 'photos'
  })

  const uploadStream = bucket.openUploadStream(filename, {
    contentType: file.type
  })
  
  uploadStream.end(file.data)

  await new Promise<void>((resolve, reject) => {
    uploadStream.on('finish', () => resolve())
    uploadStream.on('error', reject)
  })

  const fileId = uploadStream.id
  const publicPath = `/api/uploads/photos/${fileId}`

  return successResponse({ url: publicPath, fileId }, 'Photo uploaded successfully')
})
