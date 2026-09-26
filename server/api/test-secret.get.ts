export default defineEventHandler(() => {
  return useRuntimeConfig().jwtSecret
})
