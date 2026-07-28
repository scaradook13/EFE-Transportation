<script setup lang="ts">
import { useDriverStore } from '~/stores/drivers'

definePageMeta({ layout: 'default', middleware: 'auth' })

const route = useRoute()
const router = useRouter()
const driverStore = useDriverStore()
const id = route.params.id as string

const driver = ref(await driverStore.fetchById(id).catch(() => null))

useHead({ title: computed(() => `${driver.value?.fullName || 'Driver'} — EFE Taxi Dispatch`) })

const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'
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
            <div class="grid grid-cols-3 gap-4">
              <div>
                <p class="text-xs text-slate-500">Name</p>
                <p class="text-sm text-white font-medium mt-0.5">{{ driver.emergencyContact.name }}</p>
              </div>
              <div>
                <p class="text-xs text-slate-500">Relationship</p>
                <p class="text-sm text-white mt-0.5">{{ driver.emergencyContact.relationship }}</p>
              </div>
              <div>
                <p class="text-xs text-slate-500">Contact Number</p>
                <p class="text-sm text-white mt-0.5">{{ driver.emergencyContact.contactNumber }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
</template>
