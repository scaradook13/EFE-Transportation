export default defineNitroPlugin(() => {
  const isProduction = process.env.NODE_ENV === 'production'

  // Bridge standard environment variables to NUXT_ prefixes so Nitro's useRuntimeConfig() resolves them
  if (process.env.JWT_SECRET && !process.env.NUXT_JWT_SECRET) {
    process.env.NUXT_JWT_SECRET = process.env.JWT_SECRET
  }
  if (process.env.JWT_REFRESH_SECRET && !process.env.NUXT_JWT_REFRESH_SECRET) {
    process.env.NUXT_JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET
  }
  if (process.env.MONGODB_URI && !process.env.NUXT_MONGODB_URI) {
    process.env.NUXT_MONGODB_URI = process.env.MONGODB_URI
  }

  if (isProduction) {
    const jwtSecret = process.env.JWT_SECRET || process.env.NUXT_JWT_SECRET
    const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || process.env.NUXT_JWT_REFRESH_SECRET

    if (!jwtSecret || !jwtRefreshSecret) {
      console.error('CRITICAL: JWT_SECRET and JWT_REFRESH_SECRET environment variables must be set in production.')
      throw new Error(
        'CRITICAL: JWT_SECRET and JWT_REFRESH_SECRET environment variables must be set in production.'
      )
    }
  }
})
