<script setup lang="ts">
const props = defineProps<{
  userId?: string
  userName?: string
  title?: string
  description?: string
  mode?: '1:1' | '1:N'
  targetType?: 'user' | 'driver'
  endpoint?: string
  payload?: Record<string, any>
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'success', data: { user: any; biometricToken?: string }): void
  (e: 'failed', error: string): void
}>()

const state = ref<'idle' | 'scanning' | 'success' | 'failed' | 'error'>('idle')
const statusMessage = ref('Place your finger on the reader')
const recognizedUser = ref<any>(null)
const errorMessage = ref('')
const isCancelling = ref(false)
let authAbortController: AbortController | null = null

const { checkLocalReader, captureScan, cancelScan } = useBiometric()

const isNoFingerprint = computed(() => {
  const msg = (errorMessage.value || statusMessage.value || '').toLowerCase()
  return msg.includes('no fingerprint') || msg.includes('not enrolled') || msg.includes('not registered')
})

const startAuth = async () => {
  state.value = 'scanning'
  statusMessage.value = 'Connecting to fingerprint reader...'
  errorMessage.value = ''

  try {
    // 1. Verify reader is attached to THIS machine
    const localStatus = await checkLocalReader()
    if (isCancelling.value) return
    if (!localStatus.connected) {
      state.value = 'failed'
      errorMessage.value = 'Fingerprint reader not detected on this device. Please connect your USB reader.'
      statusMessage.value = errorMessage.value
      emit('failed', errorMessage.value)
      return
    }

    // 2. Trigger scan on THIS machine's USB reader
    statusMessage.value = 'Place your finger on the reader'
    authAbortController = new AbortController()
    const scanRes = await captureScan(authAbortController.signal)
    if (isCancelling.value) return

    if (!scanRes.success || !scanRes.templateId) {
      if (scanRes.status === 'cancelled') return
      state.value = 'failed'
      errorMessage.value = scanRes.error || 'Failed login'
      statusMessage.value = errorMessage.value
      emit('failed', errorMessage.value)
      return
    }

    // 3. Send scanned template to server for verification
    statusMessage.value = 'Verifying fingerprint...'
    const targetUrl = props.endpoint || '/api/biometric/authenticate'
    const requestBody = {
      ...(props.payload || {
        mode: props.mode || (props.userId ? '1:1' : '1:N'),
        userId: props.userId,
        targetType: props.targetType || 'user'
      }),
      template: scanRes.templateId
    }

    const res = await $fetch<{ success: boolean; data: any; message?: string }>(targetUrl, {
      method: 'POST',
      body: requestBody,
      signal: authAbortController.signal
    })

    if (isCancelling.value) return

    if ((res.data?.verified && res.data?.biometricToken) || res.data?.user) {
      state.value = 'success'
      recognizedUser.value = res.data.user
      statusMessage.value = res.message || 'Fingerprint recognized'
      emit('success', { user: res.data.user, biometricToken: res.data.biometricToken })
      setTimeout(() => {
        emit('close')
      }, 1500)
    } else {
      state.value = 'failed'
      statusMessage.value = 'Failed login'
      errorMessage.value = 'Failed login'
      emit('failed', statusMessage.value)
    }
  } catch (err: any) {
    if (!isCancelling.value) {
      state.value = 'failed'
      errorMessage.value = err?.data?.message || err?.message || 'Failed login'
      statusMessage.value = errorMessage.value
      emit('failed', errorMessage.value)
    }
  }
}

const handleCancel = () => {
  isCancelling.value = true
  if (authAbortController) {
    try { authAbortController.abort() } catch {}
  }
  cancelScan()
  emit('close')
}

onMounted(() => {
  startAuth()
})

onUnmounted(() => {
  isCancelling.value = true
  if (authAbortController) {
    try { authAbortController.abort() } catch {}
  }
  cancelScan()
})
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn" @click.self="handleCancel">
      <div class="glass-card w-full max-w-sm p-6 border border-white/10 relative shadow-2xl text-center">
        <!-- Close button in top-right -->
        <button
          type="button"
          class="absolute top-3.5 right-3.5 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          @click="handleCancel"
        >
          <UIcon name="i-heroicons-x-mark" class="w-5 h-5" />
        </button>

        <!-- Title -->
        <h3 class="text-base font-bold text-white uppercase tracking-wider mb-1 pr-6 pl-6">
          {{ title || 'Biometric Authentication' }}
        </h3>
        <p class="text-xs text-slate-400 mb-6">
          {{ userName ? `Authenticating ${userName}` : (description || 'Place your finger on the reader to sign in') }}
        </p>

        <!-- Center Fingerprint Graphic -->
        <div class="flex flex-col items-center justify-center my-4">
          <div
            class="relative w-28 h-28 rounded-2xl flex items-center justify-center border-2 transition-all duration-500 mb-5"
            :class="[
              state === 'failed' || state === 'error' ? 'border-red-500/60 bg-red-950/20 shadow-red-500/10' :
              state === 'success' ? 'border-emerald-500/60 bg-emerald-950/20 shadow-emerald-500/10' :
              state === 'scanning' ? 'border-emerald-500/80 bg-emerald-950/30 shadow-emerald-500/20' :
              'border-slate-700 bg-slate-900/50'
            ]"
            style="box-shadow: 0 0 25px rgba(0,0,0,0.5);"
          >
            <!-- Animated scan line -->
            <div
              v-if="state === 'scanning'"
              class="absolute inset-x-2 h-0.5 bg-emerald-400/80 rounded shadow-lg shadow-emerald-400 animate-bounce"
              style="animation-duration: 1.4s;"
            />

            <!-- Success Badge -->
            <UIcon
              v-if="state === 'success'"
              name="i-heroicons-check-circle"
              class="w-16 h-16 text-emerald-400 animate-scale"
            />

            <!-- Fail Badge -->
            <UIcon
              v-else-if="state === 'failed' || state === 'error'"
              name="i-heroicons-x-circle"
              class="w-16 h-16 text-red-400 animate-pulse"
            />

            <!-- Fingerprint Scanner -->
            <UIcon
              v-else
              name="i-heroicons-finger-print"
              class="w-16 h-16 text-emerald-400/80"
            />
          </div>

          <!-- Status message -->
          <div class="min-h-[44px]">
            <div v-if="state === 'success'" class="space-y-0.5">
              <p class="text-sm font-semibold text-emerald-400">✓ Fingerprint recognized</p>
              <p v-if="recognizedUser?.fullName" class="text-xs text-slate-300">
                Welcome, <span class="font-medium text-white">{{ recognizedUser.fullName }}</span>
              </p>
            </div>

            <div v-else-if="state === 'failed' || state === 'error'" class="space-y-0.5">
              <p class="text-sm font-medium text-red-400">
                ✕ {{ isNoFingerprint ? 'No fingerprint are registered' : (errorMessage || 'Failed login') }}
              </p>
              <p v-if="!isNoFingerprint" class="text-xs text-slate-400">Please try again.</p>
              <p v-else class="text-xs text-slate-400">Please sign in with your username and password.</p>
            </div>

            <div v-else>
              <p class="text-sm font-medium text-slate-200">{{ statusMessage }}</p>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="mt-6 flex items-center justify-center gap-3 pt-3 border-t border-white/5">
          <button
            v-if="state === 'failed' || state === 'error'"
            type="button"
            class="text-xs px-5 py-2 flex items-center gap-1.5"
            :class="isNoFingerprint ? 'btn-secondary' : 'btn-primary'"
            @click="isNoFingerprint ? handleCancel() : startAuth()"
          >
            <UIcon :name="isNoFingerprint ? 'i-heroicons-x-mark' : 'i-heroicons-arrow-path'" class="w-4 h-4" />
            <span>{{ isNoFingerprint ? 'Close' : 'Try Again' }}</span>
          </button>

          <button
            v-if="!isNoFingerprint"
            type="button"
            class="btn-secondary text-xs px-5 py-2"
            @click="handleCancel"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
