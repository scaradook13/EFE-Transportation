<script setup lang="ts">
import { useDriverStore } from '~/stores/drivers'

definePageMeta({ layout: 'default', middleware: 'auth' })

const route = useRoute()
const router = useRouter()
const driverStore = useDriverStore()
const toast = useToast()
const id = route.params.id as string

const driver = ref(await driverStore.fetchById(id).catch(() => null))

useHead({ title: computed(() => `${driver.value?.fullName || 'Driver'} — EFE Taxi Dispatch`) })

// Reader status
const readerConnected = ref(false)
const readerName = ref('DigitalPersona 4500')

const checkReaderStatus = async () => {
  try {
    const res = await $fetch<{ success: boolean; data: any }>('/api/biometric/reader-status')
    if (res?.data) {
      readerConnected.value = !!res.data.connected
      readerName.value = res.data.description || 'HID DigitalPersona U.are.U 4500'
    }
  } catch {
    readerConnected.value = false
  }
}

onMounted(() => {
  checkReaderStatus()
})

// Biometric modal controls
const showEnrollModal = ref(false)
const isReEnroll = ref(false)
const showRemoveModal = ref(false)
const removing = ref(false)

const openEnroll = (reEnroll = false) => {
  isReEnroll.value = reEnroll
  showEnrollModal.value = true
}

const handleEnrolled = async (updatedData?: any) => {
  // Refresh driver from API
  const refreshed = await driverStore.fetchById(id).catch(() => null)
  if (refreshed) {
    driver.value = refreshed
  } else if (updatedData?.biometric) {
    if (driver.value) {
      driver.value.biometric = updatedData.biometric
    }
  }
  toast.add({
    title: 'Biometric Enrolled',
    description: `Fingerprint successfully registered for ${driver.value?.fullName}.`,
    color: 'success'
  })
}

const confirmRemoveBiometric = async () => {
  removing.value = true
  try {
    const res = await $fetch<{ success: boolean; data: any }>(`/api/drivers/${id}/biometric`, {
      method: 'DELETE'
    })
    if (res.success) {
      const refreshed = await driverStore.fetchById(id).catch(() => null)
      if (refreshed) {
        driver.value = refreshed
      } else if (driver.value) {
        driver.value.biometric = {
          enrolled: false,
          finger: 'Right Index',
          enrolledAt: null
        }
      }
      showRemoveModal.value = false
      toast.add({
        title: 'Biometric Removed',
        description: 'Driver fingerprint biometric data removed successfully.',
        color: 'success'
      })
    }
  } catch (err: any) {
    toast.add({
      title: 'Action Failed',
      description: err?.data?.message || err?.message || 'Could not remove biometric data.',
      color: 'error'
    })
  } finally {
    removing.value = false
  }
}

const formatDate = (d: string | null | undefined) => d ? new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'
const isLicenseExpiringSoon = (d: string) => {
  const diff = (new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  return diff <= 60 && diff >= 0
}
const isLicenseExpired = (d: string) => new Date(d) < new Date()
const age = computed(() => {
  if (!driver.value?.birthDate) return '—'
  return Math.floor((Date.now() - new Date(driver.value.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
})
</script>

<template>
  <div class="p-6 max-w-4xl mx-auto w-full animate-fadeIn">
    <!-- Back -->
    <button class="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm mb-5" @click="router.back()">
      <UIcon name="i-heroicons-arrow-left" class="w-4 h-4" />
      Back to Drivers
    </button>

    <div v-if="!driver" class="glass-card p-16 text-center">
      <UIcon name="i-heroicons-user" class="w-12 h-12 text-slate-700 mx-auto mb-3" />
      <p class="text-slate-400">Driver not found</p>
    </div>

    <div v-else class="space-y-5">
      <!-- Profile card -->
      <div class="glass-card p-6 flex flex-col sm:flex-row items-start gap-6">
        <div class="w-24 h-24 rounded-full overflow-hidden shrink-0 border-2" style="border-color: rgba(34,197,94,0.3); box-shadow: 0 0 20px rgba(34,197,94,0.15);">
          <img v-if="driver.photo" :src="driver.photo" :alt="driver.fullName" class="w-full h-full object-cover" />
          <div v-else class="w-full h-full bg-green-900/20 flex items-center justify-center">
            <span class="text-3xl font-bold text-green-400">{{ driver.fullName.charAt(0) }}</span>
          </div>
        </div>
        <div class="flex-1">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 class="text-2xl font-bold text-white">{{ driver.fullName }}</h1>
              <p class="font-mono text-sm text-green-400 mt-1">{{ driver.driverId }}</p>
            </div>
            <span :class="['px-3 py-1 rounded-full text-sm font-medium', driver.employmentStatus === 'Active' ? 'badge-active' : 'badge-cancelled']">
              {{ driver.employmentStatus }}
            </span>
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
            <div>
              <p class="text-xs text-slate-500">Contact</p>
              <p class="text-sm text-white font-medium">{{ driver.contactNumber }}</p>
            </div>
            <div>
              <p class="text-xs text-slate-500">Age</p>
              <p class="text-sm text-white font-medium">{{ age }} years old</p>
            </div>
            <div>
              <p class="text-xs text-slate-500">Birth Date</p>
              <p class="text-sm text-white font-medium">{{ formatDate(driver.birthDate) }}</p>
            </div>
            <div>
              <p class="text-xs text-slate-500">Registered</p>
              <p class="text-sm text-white font-medium">{{ formatDate(driver.createdAt) }}</p>
            </div>
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
              <h2 class="text-base font-bold text-white uppercase tracking-wider">Driver Biometric Authentication</h2>
              <p class="text-xs text-slate-400">HID DigitalPersona U.are.U 4500 Enrollment</p>
            </div>
          </div>

          <!-- Hardware Reader Status -->
          <div class="flex items-center gap-2 bg-slate-900/60 px-3 py-1.5 rounded-lg border border-white/5">
            <span
              class="w-2.5 h-2.5 rounded-full shrink-0"
              :class="readerConnected ? 'bg-emerald-400 shadow-sm shadow-emerald-400 animate-pulse' : 'bg-red-400'"
            />
            <div class="text-xs">
              <span class="text-slate-400">Reader: </span>
              <span :class="readerConnected ? 'text-emerald-300 font-medium' : 'text-red-300 font-medium'">
                {{ readerConnected ? 'Connected' : 'Not Connected' }}
              </span>
              <span class="text-slate-500 text-[11px] block">{{ readerName }}</span>
            </div>
          </div>
        </div>

        <!-- Biometric Status Body -->
        <div class="pt-5 space-y-4">
          <!-- State: Enrolled -->
          <div
            v-if="driver.biometric?.enrolled"
            class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-emerald-950/20 border border-emerald-500/20 rounded-xl p-4"
          >
            <div class="flex items-start gap-3.5">
              <div class="w-9 h-9 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-400 shrink-0 border border-emerald-500/30">
                <UIcon name="i-heroicons-shield-check" class="w-5 h-5" />
              </div>
              <div class="space-y-0.5">
                <div class="flex items-center gap-2">
                  <p class="text-sm font-bold text-white">Fingerprint Biometric Enrolled</p>
                  <span class="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Active
                  </span>
                </div>
                <p class="text-xs text-slate-400">
                  Registered Finger: <span class="text-slate-200 font-medium">{{ driver.biometric.finger || 'Right Index' }}</span>
                </p>
                <p class="text-xs text-slate-500">
                  Enrolled On: {{ formatDate(driver.biometric.enrolledAt) }}
                </p>
              </div>
            </div>

            <!-- Action buttons -->
            <div class="flex items-center gap-2 self-end sm:self-center">
              <UButton
                size="xs"
                color="neutral"
                variant="subtle"
                icon="i-heroicons-arrow-path"
                @click="openEnroll(true)"
              >
                Re-register
              </UButton>

              <UButton
                size="xs"
                color="error"
                variant="ghost"
                icon="i-heroicons-trash"
                @click="showRemoveModal = true"
              >
                Remove
              </UButton>
            </div>
          </div>

          <!-- State: Not Enrolled -->
          <div
            v-else
            class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-amber-950/15 border border-amber-500/20 rounded-xl p-4"
          >
            <div class="flex items-start gap-3.5">
              <div class="w-9 h-9 rounded-lg bg-amber-500/15 flex items-center justify-center text-amber-400 shrink-0 border border-amber-500/30">
                <UIcon name="i-heroicons-shield-exclamation" class="w-5 h-5" />
              </div>
              <div class="space-y-0.5">
                <p class="text-sm font-bold text-white">No Biometric Registered</p>
                <p class="text-xs text-slate-400">
                  Register this driver's fingerprint biometric on the HID DigitalPersona 4500 reader.
                </p>
                <p class="text-xs text-slate-500">
                  Enrolling biometric data enables fingerprint-authenticated shift operations and taxi releases.
                </p>
              </div>
            </div>

            <div class="self-end sm:self-center">
              <UButton
                size="sm"
                color="primary"
                icon="i-heroicons-finger-print"
                class="font-medium"
                @click="openEnroll(false)"
              >
                Register Fingerprint
              </UButton>
            </div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
        <!-- Personal Info -->
        <div class="glass-card p-5">
          <h2 class="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">Personal Information</h2>
          <div class="space-y-3">
            <div>
              <p class="text-xs text-slate-500">Full Address</p>
              <p class="text-sm text-white mt-0.5">{{ driver.address }}</p>
            </div>
            <div>
              <p class="text-xs text-slate-500">Date Hired</p>
              <p class="text-sm text-white mt-0.5">{{ driver.dateHired ? formatDate(driver.dateHired) : 'Not Provided' }}</p>
            </div>
          </div>
        </div>

        <!-- License -->
        <div class="glass-card p-5">
          <h2 class="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">License Information</h2>
          <div class="space-y-3">
            <div>
              <p class="text-xs text-slate-500">License Number</p>
              <p class="font-mono text-sm text-white mt-0.5">{{ driver.licenseNumber }}</p>
            </div>
            <div>
              <p class="text-xs text-slate-500">Expiration Date</p>
              <div class="flex items-center gap-2 mt-0.5">
                <p :class="['text-sm font-medium', isLicenseExpired(driver.licenseExpiration) ? 'text-red-400' : isLicenseExpiringSoon(driver.licenseExpiration) ? 'text-yellow-400' : 'text-white']">
                  {{ formatDate(driver.licenseExpiration) }}
                </p>
                <span v-if="isLicenseExpired(driver.licenseExpiration)" class="badge-cancelled text-xs px-1.5 py-0.5 rounded-full">Expired</span>
                <span v-else-if="isLicenseExpiringSoon(driver.licenseExpiration)" class="badge-on-trip text-xs px-1.5 py-0.5 rounded-full">Expiring Soon</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Government IDs -->
        <div class="glass-card p-5 md:col-span-2">
          <h2 class="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">Government Identification</h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p class="text-xs text-slate-500">TIN ID</p>
              <p class="font-mono text-sm text-white mt-0.5">{{ driver.tinId || 'Not Provided' }}</p>
            </div>
            <div>
              <p class="text-xs text-slate-500">SSS ID</p>
              <p class="font-mono text-sm text-white mt-0.5">{{ driver.sssId || 'Not Provided' }}</p>
            </div>
            <div>
              <p class="text-xs text-slate-500">PhilHealth ID</p>
              <p class="font-mono text-sm text-white mt-0.5">{{ driver.philhealthId || 'Not Provided' }}</p>
            </div>
            <div>
              <p class="text-xs text-slate-500">Pag-IBIG ID</p>
              <p class="font-mono text-sm text-white mt-0.5">{{ driver.pagibigId || 'Not Provided' }}</p>
            </div>
          </div>
        </div>

        <!-- Emergency Contact -->
        <div class="glass-card p-5 md:col-span-2">
          <h2 class="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">Emergency Contact</h2>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <p class="text-xs text-slate-500">Name</p>
              <p class="text-sm text-white font-medium mt-0.5">{{ driver.emergencyContact?.name || '—' }}</p>
            </div>
            <div>
              <p class="text-xs text-slate-500">Relationship</p>
              <p class="text-sm text-white mt-0.5">{{ driver.emergencyContact?.relationship || '—' }}</p>
            </div>
            <div>
              <p class="text-xs text-slate-500">Contact Number</p>
              <p class="text-sm text-white mt-0.5">{{ driver.emergencyContact?.contactNumber || '—' }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Biometric Enrollment Modal -->
    <BiometricEnrollModal
      v-if="showEnrollModal && driver"
      :user-id="driver._id"
      :user-name="driver.fullName"
      :is-re-enroll="isReEnroll"
      target-type="driver"
      @close="showEnrollModal = false"
      @enrolled="handleEnrolled"
    />

    <!-- Remove Biometric Confirmation Modal -->
    <UModal v-model:open="showRemoveModal">
      <template #content>
        <div class="p-6 space-y-4">
          <div class="flex items-center gap-3 text-red-400">
            <div class="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
              <UIcon name="i-heroicons-exclamation-triangle" class="w-6 h-6" />
            </div>
            <div>
              <h3 class="text-base font-bold text-white">Remove Driver Biometric Data</h3>
              <p class="text-xs text-slate-400">This action will unbind the registered fingerprint.</p>
            </div>
          </div>

          <p class="text-sm text-slate-300">
            Are you sure you want to remove the fingerprint biometric enrolled for
            <span class="font-bold text-white">{{ driver?.fullName }}</span>?
            The driver will need to re-enroll their fingerprint before biometric authentication can be used.
          </p>

          <div class="flex items-center justify-end gap-3 pt-2">
            <UButton
              color="neutral"
              variant="outline"
              size="sm"
              :disabled="removing"
              @click="showRemoveModal = false"
            >
              Cancel
            </UButton>
            <UButton
              color="error"
              size="sm"
              icon="i-heroicons-trash"
              :loading="removing"
              @click="confirmRemoveBiometric"
            >
              Remove Biometric
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
