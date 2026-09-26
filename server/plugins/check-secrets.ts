export default defineNitroPlugin((nitroApp) => {
  const isProduction = process.env.NODE_ENV === 'production'
  if (isProduction && (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET)) {
    console.error('CRITICAL: JWT_SECRET and JWT_REFRESH_SECRET environment variables must be set in production.')
    process.exit(1)
  }
})
