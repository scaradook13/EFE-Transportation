<script setup lang="ts">
const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'capture', file: File): void
}>()

const videoRef = ref<HTMLVideoElement | null>(null)
const stream = ref<MediaStream | null>(null)
const isCaptured = ref(false)
const capturedDataUrl = ref<string | null>(null)
const capturedBlob = ref<Blob | null>(null)
const isLoading = ref(false)
const isStreamReady = ref(false)
const isMirrored = ref(true)
const errorMsg = ref('')

const stopCamera = () => {
  if (stream.value) {
    stream.value.getTracks().forEach((track) => {
      track.stop()
    })
    stream.value = null
  }
  if (videoRef.value) {
    videoRef.value.srcObject = null
  }
  isStreamReady.value = false
}

const onLoadedMetadata = async () => {
  isStreamReady.value = true
  if (videoRef.value) {
    try {
      await videoRef.value.play()
    } catch {
      // Ignored
    }
  }
}

const startCamera = async () => {
  errorMsg.value = ''
  isLoading.value = true
  isStreamReady.value = false

  await nextTick()

  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    isLoading.value = false
    errorMsg.value = 'Camera access is not supported by your browser or environment. Please use Upload Photo instead.'
    return
  }

  try {
    let mediaStream: MediaStream
    try {
      // Prefer front-facing camera on mobile / user-facing webcam
      mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      })
    } catch {
      // Fallback constraint if facingMode constraint fails
      mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false
      })
    }

    stream.value = mediaStream
    await nextTick()

    if (videoRef.value) {
      videoRef.value.srcObject = mediaStream
      videoRef.value.muted = true
      videoRef.value.playsInline = true
      videoRef.value.autoplay = true
      try {
        await videoRef.value.play()
        isStreamReady.value = true
      } catch {
        // Will play when onLoadedMetadata / canplay triggers
      }
    }
  } catch (err: unknown) {
    const error = err as Error
    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      errorMsg.value = 'Camera access was denied. Please allow camera permission or use Upload Photo instead.'
    } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
      errorMsg.value = 'No camera found on this device. Please use Upload Photo instead.'
    } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
      errorMsg.value = 'The camera is already being used by another application. Please close it or use Upload Photo instead.'
    } else {
      errorMsg.value = error.message || 'Camera initialization failed. Please use Upload Photo instead.'
    }
  } finally {
    isLoading.value = false
  }
}

const capturePhoto = () => {
  if (!videoRef.value) return
  const video = videoRef.value

  const width = video.videoWidth || 640
  const height = video.videoHeight || 480

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  if (isMirrored.value) {
    // Mirror horizontally so captured photo matches mirror view
    ctx.translate(width, 0)
    ctx.scale(-1, 1)
  }
  ctx.drawImage(video, 0, 0, width, height)

  capturedDataUrl.value = canvas.toDataURL('image/jpeg', 0.85)

  canvas.toBlob(
    (blob) => {
      if (blob) {
        capturedBlob.value = blob
      }
    },
    'image/jpeg',
    0.85
  )

  // Turn off camera tracks immediately after capture so indicator LED turns off
  stopCamera()
  isCaptured.value = true
}

const retakePhoto = () => {
  capturedDataUrl.value = null
  capturedBlob.value = null
  isCaptured.value = false
  nextTick(() => {
    startCamera()
  })
}

const closeModal = () => {
  stopCamera()
  capturedDataUrl.value = null
  capturedBlob.value = null
  isCaptured.value = false
  errorMsg.value = ''
  emit('update:modelValue', false)
}

const usePhoto = () => {
  if (capturedBlob.value) {
    const file = new File([capturedBlob.value], `driver-photo-${Date.now()}.jpg`, {
      type: 'image/jpeg'
    })
    emit('capture', file)
    closeModal()
  }
}

watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) {
      capturedDataUrl.value = null
      capturedBlob.value = null
      isCaptured.value = false
      errorMsg.value = ''
      nextTick(() => {
        startCamera()
      })
    } else {
      stopCamera()
    }
  }
)

watch(videoRef, (video) => {
  if (video && stream.value && video.srcObject !== stream.value) {
    video.srcObject = stream.value
    video.muted = true
    video.playsInline = true
    video.play().then(() => {
      isStreamReady.value = true
    }).catch(() => {})
  }
})

onBeforeUnmount(() => {
  stopCamera()
})
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="modelValue"
        class="fixed inset-0 z-[60] flex items-center justify-center p-4"
      >
        <!-- Backdrop -->
        <div
          class="absolute inset-0 bg-black/60 backdrop-blur-sm"
          @click="closeModal"
        />

        <!-- Modal Dialog -->
        <div class="relative w-full max-w-lg glass-card p-6 animate-fadeIn shadow-2xl overflow-hidden flex flex-col">
          <!-- Header -->
          <div class="flex items-center justify-between mb-4">
            <div>
              <h2 class="text-lg font-bold text-white flex items-center gap-2">
                <UIcon
                  name="i-heroicons-camera"
                  class="w-5 h-5 text-green-400"
                />
                {{ isCaptured ? 'Photo Preview' : 'Capture Driver Photo' }}
              </h2>
              <p class="text-xs text-slate-400 mt-0.5">
                {{ isCaptured ? 'Review the captured portrait before saving' : 'Position the driver in front of the camera' }}
              </p>
            </div>
            <button
              type="button"
              class="p-2 rounded-lg hover:bg-white/5 transition-colors text-slate-400 hover:text-white"
              title="Close camera"
              @click="closeModal"
            >
              <UIcon
                name="i-heroicons-x-mark"
                class="w-5 h-5"
              />
            </button>
          </div>

          <!-- Main Viewport -->
          <div class="relative w-full aspect-[4/3] bg-black/90 rounded-xl overflow-hidden border border-white/10 flex items-center justify-center mb-5">
            <!-- Captured Image Preview -->
            <div
              v-if="isCaptured && capturedDataUrl"
              class="relative w-full h-full"
            >
              <img
                :src="capturedDataUrl"
                alt="Captured portrait"
                class="w-full h-full object-cover"
              >
              <div class="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-xs text-green-400 font-medium flex items-center gap-1.5 border border-green-500/30">
                <span class="w-1.5 h-1.5 rounded-full bg-green-400" />
                Photo Captured
              </div>
            </div>

            <!-- Error State -->
            <div
              v-else-if="errorMsg"
              class="p-6 text-center max-w-sm"
            >
              <div class="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-3">
                <UIcon
                  name="i-heroicons-exclamation-triangle"
                  class="w-6 h-6 text-red-400"
                />
              </div>
              <h3 class="text-sm font-semibold text-white mb-1">
                Camera Unavailable
              </h3>
              <p class="text-xs text-red-400 mb-4">
                {{ errorMsg }}
              </p>
              <div class="flex gap-2 justify-center">
                <button
                  type="button"
                  class="btn-secondary text-xs"
                  @click="closeModal"
                >
                  Close
                </button>
                <button
                  type="button"
                  class="btn-primary text-xs"
                  @click="startCamera"
                >
                  <UIcon
                    name="i-heroicons-arrow-path"
                    class="w-3.5 h-3.5"
                  />
                  Try Again
                </button>
              </div>
            </div>

            <!-- Live Video Stream -->
            <div
              v-show="!isCaptured && !errorMsg"
              class="relative w-full h-full"
            >
              <video
                ref="videoRef"
                autoplay
                playsinline
                muted
                class="w-full h-full object-cover transition-transform duration-200"
                :style="{ transform: isMirrored ? 'scaleX(-1)' : 'scaleX(1)' }"
                @loadedmetadata="onLoadedMetadata"
                @canplay="isStreamReady = true"
              />
              <!-- Subtle Portrait Guide Outline -->
              <div class="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div class="w-48 h-56 rounded-full border-2 border-dashed border-white/25 shadow-inner" />
              </div>
              <!-- Live Indicator -->
              <div class="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-xs text-white font-medium flex items-center gap-1.5 border border-white/10">
                <span class="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                Live Camera
              </div>

              <!-- Mirror View Toggle -->
              <button
                type="button"
                class="absolute top-3 right-3 bg-black/60 hover:bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-full text-xs text-white/90 hover:text-white transition-colors flex items-center gap-1.5 border border-white/10 z-10"
                title="Toggle Mirror Camera View"
                @click="isMirrored = !isMirrored"
              >
                <UIcon
                  name="i-heroicons-arrows-right-left"
                  class="w-3.5 h-3.5 text-slate-300"
                />
                <span>{{ isMirrored ? 'Mirrored' : 'Normal' }}</span>
              </button>

              <!-- Loading Overlay -->
              <div
                v-if="isLoading"
                class="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-3 text-slate-400 z-10"
              >
                <UIcon
                  name="i-heroicons-arrow-path"
                  class="w-8 h-8 animate-spin text-green-400"
                />
                <p class="text-sm">
                  Starting camera...
                </p>
              </div>
            </div>
          </div>

          <!-- Footer Actions -->
          <div class="flex gap-3">
            <!-- Review Actions -->
            <template v-if="isCaptured">
              <button
                type="button"
                class="btn-secondary flex-1 justify-center"
                @click="retakePhoto"
              >
                <UIcon
                  name="i-heroicons-arrow-path"
                  class="w-4 h-4"
                />
                Retake
              </button>
              <button
                type="button"
                class="btn-primary flex-1 justify-center"
                @click="usePhoto"
              >
                <UIcon
                  name="i-heroicons-check"
                  class="w-4 h-4"
                />
                Use Photo
              </button>
            </template>

            <!-- Live Stream Actions -->
            <template v-else-if="!errorMsg">
              <button
                type="button"
                class="btn-secondary flex-1 justify-center"
                @click="closeModal"
              >
                Cancel
              </button>
              <button
                type="button"
                class="btn-primary flex-1 justify-center"
                :disabled="isLoading || !stream || !isStreamReady"
                @click="capturePhoto"
              >
                <UIcon
                  name="i-heroicons-camera"
                  class="w-4 h-4"
                />
                Capture Photo
              </button>
            </template>

            <!-- Error State Action -->
            <template v-else>
              <button
                type="button"
                class="btn-secondary w-full justify-center"
                @click="closeModal"
              >
                Close
              </button>
            </template>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
