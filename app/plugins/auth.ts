export default defineNuxtPlugin(async (nuxtApp) => {
  const authStore = useAuthStore()

  // Wait for auth initialization on application startup
  if (!authStore.initialized) {
    await authStore.fetchCurrentUser()
  }
})
