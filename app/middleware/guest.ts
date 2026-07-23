import { useAuthStore } from '~/stores/auth'

export default defineNuxtRouteMiddleware(async () => {
  const authStore = useAuthStore()

  if (!authStore.initialized) {
    await authStore.fetchCurrentUser()
  }

  if (authStore.isAuthenticated) {
    return navigateTo('/')
  }
})
