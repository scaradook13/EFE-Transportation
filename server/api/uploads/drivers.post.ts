import { createWriteStream, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { v4 as uuidv4 } from 'uuid'

export default defineEventHandler(async (event) => {
  requireAuth(event)

  const uploadDir = join(process.cwd(), 'public', 'uploads', 'drivers')

  try {
    mkdirSync(uploadDir, { recursive: true })
  } catch {
    // Directory already exists
  }

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

  const ext = (file.type || 'image/jpeg').split('/')[1]
  const filename = `driver-${uuidv4()}.${ext}`
  const filepath = join(uploadDir, filename)

  await new Promise<void>((resolve, reject) => {
    const stream = createWriteStream(filepath)
    stream.write(file.data)
    stream.end()
    stream.on('finish', resolve)
    stream.on('error', reject)
  })

  const publicPath = `/uploads/drivers/${filename}`

  return successResponse({ url: publicPath }, 'Photo uploaded successfully')
})
