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

import { loginSchema } from '~~/shared/utils/validations'
import { useFormValidation } from '~/composables/useFormValidation'

const form = reactive({ username: '', password: '' })
const { errors, validate, touch } = useFormValidation(loginSchema, form)

const error = ref('')
const loading = ref(false)
const showPassword = ref(false)
const showBioModal = ref(false)
const readerConnected = ref(false)
const readerName = ref('')

const checkReaderStatus = async () => {
  try {
    const res = await $fetch<{ success: boolean; data: any }>('/api/biometric/reader-status')
    readerConnected.value = !!res.data?.connected
    readerName.value = res.data?.description || 'DigitalPersona 4500'
  } catch {
    readerConnected.value = false
  }
}

onMounted(() => {
  checkReaderStatus()
})

const startBiometricLogin = async () => {
  error.value = ''
  await checkReaderStatus()
  if (!readerConnected.value) {
    error.value = 'Fingerprint reader not detected. Please connect your DigitalPersona 4500 reader.'
    return
  }
  showBioModal.value = true
}

const onBiometricSuccess = (data: { user: any }) => {
  if (data?.user) {
    authStore.user = data.user
    const redirect = route.query.redirect as string || '/'
    router.push(redirect)
  }
}

const handleLogin = async () => {
  if (!validate()) return
  
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
              @blur="touch('username')"
              type="text"
              class="form-input"
              :class="{ 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20': errors.username }"
              placeholder="Enter your username"
              autocomplete="username"
              :disabled="loading"
            />
          </div>
          <p v-if="errors.username" class="mt-1 text-xs text-red-400">{{ errors.username }}</p>
        </div>

        <!-- Password -->
        <div>
          <label class="form-label" for="password">Password</label>
          <div class="relative">
            <input
              id="password"
              v-model="form.password"
              @blur="touch('password')"
              :type="showPassword ? 'text' : 'password'"
              class="form-input pr-10"
              :class="{ 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20': errors.password }"
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
          <p v-if="errors.password" class="mt-1 text-xs text-red-400">{{ errors.password }}</p>
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

        <!-- Divider -->
        <div class="relative flex items-center justify-center pt-1 pb-1">
          <div class="border-t border-slate-700/60 w-full" />
          <span class="bg-[#111827] px-3 text-xs text-slate-500 uppercase tracking-wider font-semibold shrink-0">or</span>
        </div>

        <!-- Biometric Sign In Button -->
        <button
          type="button"
          class="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl font-semibold text-sm transition-all border shadow-lg cursor-pointer"
          :class="[
            readerConnected
              ? 'border-emerald-500/40 bg-emerald-950/20 text-emerald-400 hover:bg-emerald-900/30 hover:border-emerald-500/60 hover:text-emerald-300 shadow-emerald-950/30'
              : 'border-slate-700/60 bg-slate-800/40 text-slate-400 hover:bg-slate-800/70 hover:text-slate-300'
          ]"
          :disabled="loading"
          @click="startBiometricLogin"
        >
          <UIcon name="i-heroicons-finger-print" class="w-5 h-5 text-emerald-400" />
          <span>{{ form.username ? `Sign In as "${form.username}" with Fingerprint` : 'Sign In with Fingerprint' }}</span>
        </button>

        <!-- Reader Connection Status -->
        <div class="flex items-center justify-center gap-2 text-xs text-slate-400 pt-1">
          <span
            class="w-2 h-2 rounded-full transition-colors"
            :class="readerConnected ? 'bg-emerald-400 shadow-sm shadow-emerald-400 animate-pulse' : 'bg-slate-600'"
          />
          <span>Biometric Reader:</span>
          <span :class="readerConnected ? 'text-emerald-400 font-medium' : 'text-slate-500'">
            {{ readerConnected ? 'Connected & Ready' : 'Not Detected' }}
          </span>
        </div>
      </form>

      <!-- Footer -->
      <p class="text-center text-xs text-slate-600 mt-6">
        EFE Taxi Dispatch System &copy; {{ new Date().getFullYear() }} EFE Group of Taxi
      </p>
    </div>

    <!-- Biometric Login Modal -->
    <BiometricAuthModal
      v-if="showBioModal"
      :user-name="form.username || undefined"
      title="Biometric Sign In"
      :description="form.username ? `Place your finger on the reader to verify account ${form.username}` : 'Place your finger on the DigitalPersona 4500 reader to sign in'"
      :mode="form.username ? '1:1' : '1:N'"
      endpoint="/api/auth/biometric-login"
      :payload="{ username: form.username || undefined }"
      @close="showBioModal = false"
      @success="onBiometricSuccess"
      @failed="(msg) => error = msg"
    />
  </div>
</template>

<style scoped>
.fade-slide-enter-active, .fade-slide-leave-active { transition: all 0.3s ease; }
.fade-slide-enter-from, .fade-slide-leave-to { opacity: 0; transform: translateY(-8px); }
</style>
