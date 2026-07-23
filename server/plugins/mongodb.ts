
export default defineNitroPlugin(async (_nitroApp) => {
  try {
    await connectDB()
  } catch (err) {
    console.error('Failed to connect to MongoDB on startup:', err)
  }
})
