<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

definePageMeta({ layout: 'default', middleware: 'auth' })
useHead({ title: 'My Profile — EFE Taxi Dispatch System' })

const authStore = useAuthStore()
const toast = useToast()

const user = computed(() => authStore.user)
const loading = ref(true)
const statusData = ref<{
  enrolled: boolean
  finger: string
  enrolledAt: string | null
  readerConnected: boolean
  readerName: string
} | null>(null)

const showEnrollModal = ref(false)
const isReEnroll = ref(false)
const showRemoveModal = ref(false)
const removing = ref(false)

const loadBiometricStatus = async () => {
  if (!user.value?.userId) return
  loading.value = true
  try {
    const res = await $fetch<{ success: boolean; data: typeof statusData.value }>(
      `/api/users/${user.value.userId}/biometric/status`
    )
    statusData.value = res.data
    // Sync with auth store
    if (authStore.user && res.data) {
      authStore.user.biometric = {
        enrolled: res.data.enrolled,
        finger: res.data.finger,
        enrolledAt: res.data.enrolledAt
      }
    }
  } catch (err: any) {
    console.error('Failed to load biometric status:', err)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadBiometricStatus()
})

const openEnroll = () => {
  isReEnroll.value = false
  showEnrollModal.value = true
}

const openReEnroll = () => {
  isReEnroll.value = true
  showEnrollModal.value = true
}

const handleEnrolled = async () => {
  toast.add({
    title: 'Fingerprint enrolled successfully!',
    description: 'Your biometric credential is now active.',
    color: 'success'
  })
  await loadBiometricStatus()
}

const handleRemove = async () => {
  if (!user.value?.userId) return
  removing.value = true
  try {
    await $fetch(`/api/users/${user.value.userId}/biometric`, {
      method: 'DELETE'
    })
    toast.add({
      title: 'Fingerprint removed',
      description: 'Your biometric credential has been deleted.',
      color: 'info'
    })
    showRemoveModal.value = false
    await loadBiometricStatus()
  } catch (err: any) {
    toast.add({
      title: 'Failed to remove biometric',
      description: err?.data?.message || err?.message || 'Error removing fingerprint',
      color: 'error'
    })
  } finally {
    removing.value = false
  }
}

const formatDate = (d: string | null) => {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })
}
</script>

<template>
  <div class="p-6 max-w-4xl mx-auto space-y-6 animate-fadeIn">
    <!-- Header -->
    <div class="flex items-center justify-between border-b border-white/5 pb-4">
      <div>
        <h1 class="text-2xl font-bold text-white tracking-wide uppercase">My Profile</h1>
        <p class="text-xs text-slate-400 mt-1">Manage your account information and biometric credentials</p>
      </div>
      <div class="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg text-white shadow-lg"
        style="background: linear-gradient(135deg, #16a34a, #f9a825);"
      >
        {{ user?.fullName?.charAt(0)?.toUpperCase() || 'U' }}
      </div>
    </div>

    <!-- Account Details Card -->
    <div class="glass-card p-6 border border-white/10 space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-sm font-semibold text-slate-300 uppercase tracking-wider">Account Information</h2>
        <span class="px-2.5 py-0.5 rounded-full text-xs font-medium capitalize"
          :class="user?.role === 'admin' ? 'badge-completed' : user?.role === 'dispatcher' ? 'badge-available' : 'badge-maintenance'"
        >
          {{ user?.role }}
        </span>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
        <div>
          <p class="text-xs text-slate-500 font-medium">Name</p>
          <p class="text-base font-semibold text-white mt-0.5">{{ user?.fullName || '—' }}</p>
        </div>

        <div>
          <p class="text-xs text-slate-500 font-medium">Username</p>
          <p class="text-sm font-mono text-emerald-400 mt-0.5">{{ user?.username || '—' }}</p>
        </div>

        <div>
          <p class="text-xs text-slate-500 font-medium">Email</p>
          <p class="text-sm text-slate-300 mt-0.5">{{ user?.email || `${user?.username}@efe-transportation.com` }}</p>
        </div>
      </div>
    </div>

    <!-- Biometric Authentication Card -->
    <div class="glass-card p-6 border border-white/10 relative overflow-hidden">
      <!-- Top banner line -->
      <div class="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 via-green-400 to-amber-400" />

      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
            <UIcon name="i-heroicons-finger-print" class="w-6 h-6" />
          </div>
          <div>
            <h2 class="text-base font-bold text-white uppercase tracking-wider">Biometric Authentication</h2>
            <p class="text-xs text-slate-400">HID DigitalPersona U.are.U 4500 Integration</p>
          </div>
        </div>

        <!-- Hardware Reader Status -->
        <div class="flex items-center gap-2 bg-slate-900/60 px-3 py-1.5 rounded-lg border border-white/5">
          <span
            class="w-2.5 h-2.5 rounded-full shrink-0"
            :class="statusData?.readerConnected ? 'bg-emerald-400 shadow-sm shadow-emerald-400 animate-pulse' : 'bg-red-400'"
          />
          <div class="text-xs">
            <span class="text-slate-400">Reader: </span>
            <span :class="statusData?.readerConnected ? 'text-emerald-300 font-medium' : 'text-red-300 font-medium'">
              {{ statusData?.readerConnected ? 'Connected' : 'Not Connected' }}
            </span>
            <span class="text-slate-500 text-[11px] block">{{ statusData?.readerName || 'DigitalPersona 4500' }}</span>
          </div>
        </div>
      </div>

      <!-- Biometric Details Body -->
      <div class="py-6 space-y-6">
        <!-- Status indicator row -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p class="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">Fingerprint Status</p>
            <div class="flex items-center gap-2">
              <span
                class="w-3 h-3 rounded-full"
                :class="statusData?.enrolled ? 'bg-emerald-400 shadow-md shadow-emerald-400/50' : 'border-2 border-slate-500'"
              />
              <span class="text-base font-bold" :class="statusData?.enrolled ? 'text-emerald-400' : 'text-slate-400'">
                {{ statusData?.enrolled ? 'Registered' : 'Not Registered' }}
              </span>
            </div>
          </div>

          <div v-if="statusData?.enrolled">
            <p class="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">Registered Date</p>
            <p class="text-sm font-semibold text-slate-200">
              {{ formatDate(statusData?.enrolledAt) }}
            </p>
          </div>

          <div v-if="statusData?.enrolled">
            <p class="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">Enrolled Finger</p>
            <p class="text-sm font-semibold text-slate-200">
              {{ statusData?.finger || 'Right Index' }}
            </p>
          </div>
        </div>

        <!-- If NOT registered: Warning / Guidance note -->
        <div v-if="!statusData?.enrolled" class="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
          <UIcon name="i-heroicons-information-circle" class="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div class="text-xs text-amber-200/90 leading-relaxed">
            <p class="font-semibold text-amber-300 mb-0.5">Biometric enrollment required</p>
            Biometric enrollment is required before biometric-protected operations (such as taxi dispatch) can be performed.
          </div>
        </div>

        <!-- Buttons -->
        <div class="pt-2 flex flex-wrap items-center gap-3">
          <button
            v-if="!statusData?.enrolled"
            type="button"
            class="btn-primary text-xs px-5 py-2.5 flex items-center gap-2 shadow-lg shadow-emerald-950/50"
            @click="openEnroll"
          >
            <UIcon name="i-heroicons-finger-print" class="w-4 h-4" />
            Register Fingerprint
          </button>

          <template v-else>
            <button
              type="button"
              class="btn-secondary text-xs px-4 py-2 flex items-center gap-2"
              @click="openReEnroll"
            >
              <UIcon name="i-heroicons-arrow-path" class="w-4 h-4" />
              Re-register Fingerprint
            </button>

            <button
              type="button"
              class="px-4 py-2 text-xs font-medium rounded-lg text-red-400 hover:text-red-300 hover:bg-red-950/30 border border-red-500/20 transition-colors flex items-center gap-1.5"
              @click="showRemoveModal = true"
            >
              <UIcon name="i-heroicons-trash" class="w-4 h-4" />
              Remove Fingerprint
            </button>
          </template>
        </div>
      </div>
    </div>

    <!-- Enrollment Modal -->
    <BiometricEnrollModal
      v-if="showEnrollModal && user"
      :user-id="user.userId"
      :user-name="user.fullName"
      :is-re-enroll="isReEnroll"
      @close="showEnrollModal = false"
      @enrolled="handleEnrolled"
    />

    <!-- Removal Confirmation Modal -->
    <div v-if="showRemoveModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div class="glass-card w-full max-w-sm p-6 border border-white/10 relative shadow-2xl text-center">
        <div class="w-12 h-12 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center mx-auto mb-4 border border-red-500/20">
          <UIcon name="i-heroicons-exclamation-triangle" class="w-6 h-6" />
        </div>
        <h3 class="text-base font-bold text-white mb-2">Remove fingerprint?</h3>
        <p class="text-xs text-slate-400 leading-relaxed mb-6">
          This will remove your registered biometric authentication credential. You will need to re-register before performing biometric-protected actions.
        </p>
        <div class="flex items-center justify-center gap-3">
          <button
            type="button"
            class="btn-secondary text-xs px-4 py-2"
            :disabled="removing"
            @click="showRemoveModal = false"
          >
            Cancel
          </button>
          <button
            type="button"
            class="px-4 py-2 text-xs font-semibold rounded-lg bg-red-600 hover:bg-red-500 text-white transition-colors"
            :disabled="removing"
            @click="handleRemove"
          >
            {{ removing ? 'Removing...' : 'Remove' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
