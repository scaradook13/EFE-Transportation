<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

definePageMeta({ layout: 'auth', middleware: 'guest' })

useHead({
  title: 'Login — EFE Taxi Dispatch System',
  meta: [{ name: 'description', content: 'Sign in to EFE Taxi Dispatch System to manage your fleet and dispatch operations.' }]
})

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()

const form = reactive({ username: '', password: '' })
const error = ref('')
const loading = ref(false)
const showPassword = ref(false)

const handleLogin = async () => {
  if (!form.username || !form.password) {
    error.value = 'Please enter your username and password'
    return
  }
  error.value = ''
  loading.value = true
  try {
    await authStore.login(form.username, form.password)
    const redirect = route.query.redirect as string || '/'
    router.push(redirect)
  } catch (err: unknown) {
    error.value = (err as { data?: { message?: string }; message?: string })?.data?.message
      || (err as { message?: string })?.message
      || 'Login failed. Please try again.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-4 animate-fadeIn">
    <!-- Card -->
    <div class="glass-card p-8 w-full max-w-md" style="background: rgba(17,24,39,0.9); border: 1px solid rgba(255,255,255,0.08);">
      <!-- Logo & Branding -->
      <div class="text-center mb-8">
        <div class="flex justify-center mb-4">
          <div class="relative inline-block">
            <img src="/logo.png" alt="EFE Group of Taxi" class="w-20 h-20 rounded-full object-cover shadow-lg" style="box-shadow: 0 0 30px rgba(34,197,94,0.3);" />
            <div class="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-gray-900 animate-pulse-green" />
          </div>
        </div>
        <h1 class="text-2xl font-bold text-white mb-1">EFE Taxi Dispatch</h1>
        <p class="text-sm font-medium" style="color: #f9a825;">EFE Group of Taxi</p>
        <p class="text-xs text-slate-500 mt-1">Dispatch Management System</p>
      </div>

      <!-- Form -->
      <form @submit.prevent="handleLogin" class="space-y-5">
        <!-- Error -->
        <Transition name="fade-slide">
          <div
            v-if="error"
            class="flex items-center gap-3 px-4 py-3 rounded-lg text-sm"
            style="background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); color: #f87171;"
          >
            <UIcon name="i-heroicons-exclamation-circle" class="w-4 h-4 shrink-0" />
            <span>{{ error }}</span>
          </div>
        </Transition>

        <!-- Username -->
        <div>
          <label class="form-label" for="username">Username</label>
          <div class="relative">
            <input
              id="username"
              v-model="form.username"
              type="text"
              class="form-input"
              placeholder="Enter your username"
              autocomplete="username"
              :disabled="loading"
            />
          </div>
        </div>

        <!-- Password -->
        <div>
          <label class="form-label" for="password">Password</label>
          <div class="relative">
            <input
              id="password"
              v-model="form.password"
              :type="showPassword ? 'text' : 'password'"
              class="form-input pr-10"
              placeholder="Enter your password"
              autocomplete="current-password"
              :disabled="loading"
            />
            <button
              type="button"
              class="absolute right-3 top-1/2 -translate-y-1/2"
              @click="showPassword = !showPassword"
            >
              <UIcon
                :name="showPassword ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'"
                class="w-4 h-4 text-slate-500 hover:text-slate-300 transition-colors"
              />
            </button>
          </div>
        </div>

        <!-- Submit -->
        <button
          type="submit"
          class="btn-primary w-full justify-center py-3 text-base"
          :disabled="loading"
        >
          <UIcon v-if="loading" name="i-heroicons-arrow-path" class="w-4 h-4 animate-spin" />
          <UIcon v-else name="i-heroicons-arrow-right-on-rectangle" class="w-4 h-4" />
          {{ loading ? 'Signing in...' : 'Sign In' }}
        </button>
      </form>

      <!-- Footer -->
      <p class="text-center text-xs text-slate-600 mt-6">
        EFE Taxi Dispatch System &copy; {{ new Date().getFullYear() }} EFE Group of Taxi
      </p>
    </div>
  </div>
</template>

<style scoped>
.fade-slide-enter-active, .fade-slide-leave-active { transition: all 0.3s ease; }
.fade-slide-enter-from, .fade-slide-leave-to { opacity: 0; transform: translateY(-8px); }
</style>
