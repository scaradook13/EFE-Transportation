<script setup lang="ts">
import { useDispatchStore } from '~/stores/dispatches'
import { useDriverStore } from '~/stores/drivers'
import { useTaxiUnitStore } from '~/stores/taxiUnits'

definePageMeta({ layout: 'default', middleware: 'auth' })
useHead({ title: 'New Dispatch — EFE Taxi Dispatch System' })

const router = useRouter()
const dispatchStore = useDispatchStore()
const driverStore = useDriverStore()
const taxiStore = useTaxiUnitStore()
const toast = useToast()

const loading = ref(false)
const form = reactive({
  driver: '',
  taxiUnit: '',
  passengerName: '',
  pickupLocation: '',
  destination: '',
  departureTime: new Date().toISOString().slice(0, 16),
  remarks: ''
})

onMounted(async () => {
  await Promise.all([
    driverStore.fetchActiveDrivers(),
    taxiStore.fetchAvailableUnits()
  ])
})

const handleSubmit = async () => {
  if (!form.driver || !form.taxiUnit || !form.passengerName || !form.pickupLocation || !form.destination) {
    toast.add({ title: 'Please fill in all required fields', color: 'error' })
    return
  }
  loading.value = true
  try {
    const dispatch = await dispatchStore.create({
      ...form,
      departureTime: new Date(form.departureTime).toISOString()
    })
    toast.add({ title: `Dispatch ${(dispatch as { dispatchNumber?: string })?.dispatchNumber} created!`, color: 'success' })
    router.push('/dispatches')
  } catch (err: unknown) {
    toast.add({
      title: 'Error creating dispatch',
      description: (err as { data?: { message?: string } })?.data?.message || 'Please try again',
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <NuxtLayout name="default">
    <div class="p-6 animate-fadeIn">
      <div class="flex items-center gap-3 mb-6">
        <button class="p-2 rounded-lg hover:bg-white/5 transition-colors" @click="router.back()">
          <UIcon name="i-heroicons-arrow-left" class="w-5 h-5 text-slate-400" />
        </button>
        <div>
          <h1 class="text-2xl font-bold text-white">New Dispatch</h1>
          <p class="text-sm text-slate-400 mt-0.5">Create a new taxi dispatch record</p>
        </div>
      </div>

      <div class="max-w-2xl">
        <form @submit.prevent="handleSubmit" class="glass-card p-6 space-y-5">
          <!-- Driver -->
          <div>
            <label class="form-label">Driver *</label>
            <select v-model="form.driver" class="form-input" required>
              <option value="">Select active driver...</option>
              <option v-for="d in driverStore.activeDrivers" :key="(d as { _id: string })._id" :value="(d as { _id: string })._id">
                {{ (d as { fullName: string; driverId: string }).fullName }} — {{ (d as { driverId: string }).driverId }}
              </option>
            </select>
            <p v-if="!driverStore.activeDrivers.length" class="text-xs text-yellow-500 mt-1">No active drivers available</p>
          </div>

          <!-- Taxi Unit -->
          <div>
            <label class="form-label">Taxi Unit *</label>
            <select v-model="form.taxiUnit" class="form-input" required>
              <option value="">Select available taxi...</option>
              <option v-for="t in taxiStore.availableUnits" :key="(t as { _id: string })._id" :value="(t as { _id: string })._id">
                {{ (t as { taxiNumber: string }).taxiNumber }} — {{ (t as { plateNumber: string }).plateNumber }} ({{ (t as { brand: string; model: string }).brand }} {{ (t as { model: string }).model }})
              </option>
            </select>
            <p v-if="!taxiStore.availableUnits.length" class="text-xs text-yellow-500 mt-1">No available taxis at the moment</p>
          </div>

          <!-- Passenger -->
          <div>
            <label class="form-label">Passenger Name *</label>
            <input v-model="form.passengerName" type="text" class="form-input" required placeholder="Full name of passenger" />
          </div>

          <!-- Route -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="form-label">Pickup Location *</label>
              <div class="relative">
                <UIcon name="i-heroicons-map-pin" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                <input v-model="form.pickupLocation" type="text" class="form-input pl-9" required placeholder="Starting point" />
              </div>
            </div>
            <div>
              <label class="form-label">Destination *</label>
              <div class="relative">
                <UIcon name="i-heroicons-map-pin" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500" />
                <input v-model="form.destination" type="text" class="form-input pl-9" required placeholder="Drop-off point" />
              </div>
            </div>
          </div>

          <!-- Departure Time -->
          <div>
            <label class="form-label">Departure Time *</label>
            <input v-model="form.departureTime" type="datetime-local" class="form-input" required />
          </div>

          <!-- Remarks -->
          <div>
            <label class="form-label">Remarks</label>
            <textarea v-model="form.remarks" class="form-input h-20 resize-none" placeholder="Optional notes or special instructions..." />
          </div>

          <!-- Actions -->
          <div class="flex gap-3 pt-2">
            <button type="button" class="btn-secondary flex-1" @click="router.back()">Cancel</button>
            <button type="submit" class="btn-primary flex-1" :disabled="loading">
              <UIcon v-if="loading" name="i-heroicons-arrow-path" class="w-4 h-4 animate-spin" />
              <UIcon v-else name="i-heroicons-paper-airplane" class="w-4 h-4" />
              {{ loading ? 'Creating...' : 'Create Dispatch' }}
            </button>
          </div>
        </form>

        <!-- Info tip -->
        <div class="mt-4 p-4 rounded-xl flex items-start gap-3" style="background: rgba(249,168,37,0.06); border: 1px solid rgba(249,168,37,0.15);">
          <UIcon name="i-heroicons-light-bulb" class="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
          <p class="text-xs text-yellow-200/60">
            Creating a dispatch will automatically change the selected taxi's status to <strong>On Trip</strong>.
            When the trip is completed, the taxi will return to <strong>Available</strong>.
          </p>
        </div>
      </div>
    </div>
  </NuxtLayout>
</template>
