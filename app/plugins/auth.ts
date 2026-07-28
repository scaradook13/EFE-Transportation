export default defineNuxtPlugin(async (nuxtApp) => {
  const authStore = useAuthStore()

  // Wait for auth initialization on application startup
  if (!authStore.initialized) {
    const headers = import.meta.server ? useRequestHeaders(['cookie']) as HeadersInit : undefined
    await authStore.fetchCurrentUser(headers)
  }
})
