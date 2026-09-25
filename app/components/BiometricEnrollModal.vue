<script setup lang="ts">
const props = withDefaults(defineProps<{
  userId: string
  userName: string
  isReEnroll?: boolean
  targetType?: 'user' | 'driver'
}>(), {
  targetType: 'user'
})

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'enrolled', data: any): void
}>()

const currentScan = ref(1)
const totalScans = ref(3)
const statusMessage = ref('Checking fingerprint reader...')
const stepState = ref<'checking' | 'ready' | 'scanning' | 'lift_finger' | 'processing' | 'success' | 'error'>('checking')
const errorMessage = ref('')
const readerConnected = ref(false)
const readerName = ref('DigitalPersona 4500')
const isCancelling = ref(false)

let isPolling = false
let captureAbortController: AbortController | null = null

const checkReaderAndStart = async () => {
  stepState.value = 'checking'
  statusMessage.value = 'Connecting to DigitalPersona reader...'
  errorMessage.value = ''

  try {
    const statusRes = await $fetch<{ success: boolean; data: any }>('/api/biometric/reader-status')
    if (isCancelling.value) return

    if (statusRes.data?.connected) {
      readerConnected.value = true
      readerName.value = statusRes.data.description || 'DigitalPersona 4500'
    } else {
      readerConnected.value = false
      stepState.value = 'error'
      errorMessage.value = 'Fingerprint reader not detected. Please connect the DigitalPersona fingerprint reader and try again.'
      return
    }

    // Start enrollment session (will also auto-cancel any previous stale operation)
    const startRes = await $fetch<{ success: boolean; data: any }>('/api/biometric/enroll/start', {
      method: 'POST'
    })
    if (isCancelling.value) return

    if (startRes.data?.status === 'ready') {
      currentScan.value = 1
      totalScans.value = startRes.data.totalScans || 3
      stepState.value = 'ready'
      statusMessage.value = 'Place your finger on the reader'
      runCaptureLoop()
    } else {
      throw new Error(startRes.data?.error || 'Failed to start enrollment')
    }
  } catch (err: any) {
    if (isCancelling.value) return
    stepState.value = 'error'
    errorMessage.value = err?.data?.message || err?.message || 'Fingerprint reader not detected. Please connect the DigitalPersona fingerprint reader and try again.'
  }
}

const runCaptureLoop = async () => {
  if (isPolling) return
  isPolling = true

  try {
    while (currentScan.value <= totalScans.value && stepState.value !== 'success' && stepState.value !== 'error' && !isCancelling.value) {
      stepState.value = 'scanning'
      statusMessage.value = `Scan ${currentScan.value} of ${totalScans.value} — Place finger firmly on reader`

      captureAbortController = new AbortController()
      const capRes = await $fetch<{ success: boolean; data: any }>('/api/biometric/enroll/capture', {
        method: 'POST',
        signal: captureAbortController.signal
      }).catch((err: any) => {
        if (isCancelling.value) return null
        throw err
      })

      if (isCancelling.value || !capRes) break

      const data = capRes.data
      if (data.status === 'more_data') {
        currentScan.value = data.nextScan || (currentScan.value + 1)
        stepState.value = 'lift_finger'
        statusMessage.value = `Scan ${data.scanCompleted} captured. Lift your finger and place again for Scan ${currentScan.value}.`
        // Brief pause so user can lift and re-place finger
        await new Promise(r => setTimeout(r, 1200))
      } else if (data.status === 'completed') {
        stepState.value = 'processing'
        statusMessage.value = 'Generating and saving biometric template...'

        // Save template to account (user or driver)
        const endpoint = props.targetType === 'driver'
          ? `/api/drivers/${props.userId}/biometric/enroll`
          : `/api/users/${props.userId}/biometric/enroll`

        const saveRes = await $fetch<{ success: boolean; data: any }>(endpoint, {
          method: 'POST',
          body: {
            template: data.template,
            templateId: data.templateId,
            finger: data.finger || 'Right Index'
          }
        })

        stepState.value = 'success'
        statusMessage.value = 'Fingerprint enrolled successfully!'
        emit('enrolled', saveRes.data)
        setTimeout(() => {
          emit('close')
        }, 1500)
        break
      } else {
        stepState.value = 'error'
        errorMessage.value = data.error || 'Fingerprint capture failed. Please place your finger correctly on the reader.'
        break
      }
    }
  } catch (err: any) {
    if (!isCancelling.value) {
      stepState.value = 'error'
      errorMessage.value = err?.data?.message || err?.data?.statusMessage || err?.message || 'Fingerprint capture failed. Please place your finger correctly on the reader.'
    }
  } finally {
    isPolling = false
  }
}

const handleCancel = () => {
  isCancelling.value = true
  if (captureAbortController) {
    try { captureAbortController.abort() } catch {}
  }
  // Dispatch cancel request asynchronously to immediately unblock the hardware reader
  $fetch('/api/biometric/enroll/cancel', { method: 'POST' }).catch(() => {})
  emit('close')
}

onMounted(() => {
  checkReaderAndStart()
})

onUnmounted(() => {
  isCancelling.value = true
  if (captureAbortController) {
    try { captureAbortController.abort() } catch {}
  }
  $fetch('/api/biometric/enroll/cancel', { method: 'POST' }).catch(() => {})
})
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn" @click.self="handleCancel">
      <div class="glass-card w-full max-w-md p-6 border border-white/10 relative shadow-2xl">
        <!-- Close button in top-right -->
        <button
          type="button"
          class="absolute top-3.5 right-3.5 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          @click="handleCancel"
        >
          <UIcon name="i-heroicons-x-mark" class="w-5 h-5" />
        </button>

        <!-- Header -->
        <div class="text-center mb-6">
          <h3 class="text-lg font-bold text-white uppercase tracking-wider">
          {{ isReEnroll ? 'Re-register Fingerprint' : 'Register Fingerprint' }}
        </h3>
        <p class="text-xs text-slate-400 mt-1">
          {{ userName }} • {{ readerName }}
        </p>
      </div>

      <!-- Main Visual Container -->
      <div class="flex flex-col items-center justify-center py-6 px-4">
        <!-- Fingerprint Scanner Visual -->
        <div class="relative w-32 h-32 rounded-2xl flex items-center justify-center border-2 transition-all duration-500 mb-6"
          :class="[
            stepState === 'error' ? 'border-red-500/50 bg-red-950/20 shadow-red-500/10' :
            stepState === 'success' ? 'border-emerald-500/50 bg-emerald-950/20 shadow-emerald-500/10' :
            stepState === 'scanning' ? 'border-emerald-500/80 bg-emerald-950/30 shadow-emerald-500/20' :
            stepState === 'lift_finger' ? 'border-amber-500/60 bg-amber-950/20' :
            'border-slate-700 bg-slate-900/50'
          ]"
          style="box-shadow: 0 0 25px rgba(0,0,0,0.5);"
        >
          <!-- Animated scan line effect -->
          <div
            v-if="stepState === 'scanning'"
            class="absolute inset-x-2 h-0.5 bg-emerald-400/80 rounded shadow-lg shadow-emerald-400 animate-bounce"
            style="animation-duration: 1.5s;"
          />

          <!-- Success Icon -->
          <UIcon
            v-if="stepState === 'success'"
            name="i-heroicons-check-badge"
            class="w-16 h-16 text-emerald-400 animate-scale"
          />

          <!-- Error Icon -->
          <UIcon
            v-else-if="stepState === 'error'"
            name="i-heroicons-exclamation-triangle"
            class="w-16 h-16 text-red-400 animate-pulse"
          />

          <!-- Fingerprint Icon -->
          <UIcon
            v-else
            name="i-heroicons-finger-print"
            class="w-16 h-16 transition-colors duration-300"
            :class="[
              stepState === 'scanning' ? 'text-emerald-400' :
              stepState === 'lift_finger' ? 'text-amber-400' :
              'text-slate-400'
            ]"
          />
        </div>

        <!-- Progress Indicator (Scan 1 of 3) -->
        <div v-if="stepState !== 'error' && stepState !== 'checking'" class="w-full max-w-xs mb-4">
          <div class="flex items-center justify-between text-xs font-semibold text-slate-300 mb-2">
            <span>Progress</span>
            <span class="font-mono text-emerald-400">Scan {{ Math.min(currentScan, totalScans) }} of {{ totalScans }}</span>
          </div>
          <div class="grid grid-cols-3 gap-2">
            <div
              v-for="s in totalScans"
              :key="s"
              class="h-2 rounded-full transition-all duration-500"
              :class="[
                s < currentScan ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' :
                s === currentScan && (stepState === 'scanning' || stepState === 'lift_finger') ? 'bg-emerald-400/80 animate-pulse' :
                'bg-slate-700/60'
              ]"
            />
          </div>
        </div>

        <!-- Status / Instructions -->
        <div class="text-center min-h-[48px] px-2 w-full max-w-sm">
          <div v-if="stepState === 'error'" class="p-3.5 bg-red-500/15 border border-red-500/30 rounded-xl flex items-start gap-3 text-left animate-fadeIn">
            <UIcon name="i-heroicons-exclamation-triangle" class="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p class="text-xs font-bold text-red-300 uppercase tracking-wider">Fingerprint Registration Blocked</p>
              <p class="text-xs text-red-200 mt-1 leading-relaxed">{{ errorMessage }}</p>
            </div>
          </div>

          <div v-else>
            <p
              class="text-sm font-medium transition-colors"
              :class="[
                stepState === 'success' ? 'text-emerald-400 font-semibold' :
                stepState === 'lift_finger' ? 'text-amber-300' :
                'text-slate-200'
              ]"
            >
              {{ statusMessage }}
            </p>
            <p v-if="stepState === 'scanning'" class="text-xs text-slate-400 mt-1">
              Waiting for fingerprint scan...
            </p>
            <p v-else-if="stepState === 'lift_finger'" class="text-xs text-amber-400/80 mt-1">
              Please remove your finger and place it again
            </p>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="mt-6 flex items-center justify-between gap-3 pt-4 border-t border-white/5">
        <button
          v-if="stepState === 'error'"
          type="button"
          class="btn-secondary text-xs flex items-center gap-1.5"
          @click="checkReaderAndStart"
        >
          <UIcon name="i-heroicons-arrow-path" class="w-4 h-4" />
          Retry Scan
        </button>
        <div v-else />

        <button
          type="button"
          class="btn-secondary text-xs px-4"
          :disabled="stepState === 'processing'"
          @click="handleCancel"
        >
          {{ stepState === 'success' ? 'Done' : 'Cancel' }}
        </button>
      </div>
    </div>
  </div>
  </Teleport>
</template>
