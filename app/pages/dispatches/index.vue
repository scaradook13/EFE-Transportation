<script setup lang="ts">
import { useDispatchStore } from '~/stores/dispatches'
import type { Dispatch } from '~/types'

definePageMeta({ layout: 'default', middleware: 'auth' })
useHead({ title: 'Dispatches — EFE Taxi Dispatch System' })

const dispatchStore = useDispatchStore()
const authStore = useAuthStore()
const toast = useToast()

const search = ref('')
const statusFilter = ref('')
const page = ref(1)
const showCompleteModal = ref(false)
const showCancelModal = ref(false)
const selectedDispatch = ref<Dispatch | null>(null)
const actionRemarks = ref('')
const actionLoading = ref(false)

const loadDispatches = () => {
  const params: Record<string, string | number> = { page: page.value, limit: 10 }
  if (search.value) params.search = search.value
  if (statusFilter.value) params.status = statusFilter.value
  dispatchStore.fetchAll(params)
}

onMounted(loadDispatches)
watch([search, statusFilter], useDebounceFn(() => { page.value = 1; loadDispatches() }, 400))
watch(page, loadDispatches)

const openComplete = (d: Dispatch) => { selectedDispatch.value = d; actionRemarks.value = ''; showCompleteModal.value = true }
const openCancel = (d: Dispatch) => { selectedDispatch.value = d; actionRemarks.value = ''; showCancelModal.value = true }

const handleComplete = async () => {
  if (!selectedDispatch.value) return
  actionLoading.value = true
  try {
    await dispatchStore.complete(selectedDispatch.value._id, actionRemarks.value)
    toast.add({ title: 'Dispatch completed', color: 'success' })
    showCompleteModal.value = false
    loadDispatches()
  } catch { toast.add({ title: 'Failed to complete dispatch', color: 'error' }) }
  finally { actionLoading.value = false }
}

const handleCancel = async () => {
  if (!selectedDispatch.value) return
  actionLoading.value = true
  try {
    await dispatchStore.cancel(selectedDispatch.value._id, actionRemarks.value)
    toast.add({ title: 'Dispatch cancelled', color: 'warning' })
    showCancelModal.value = false
    loadDispatches()
  } catch { toast.add({ title: 'Failed to cancel dispatch', color: 'error' }) }
  finally { actionLoading.value = false }
}

const formatDateTime = (d: string) => new Date(d).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })
const formatDuration = (mins: number | null) => {
  if (!mins) return '—'
  if (mins < 60) return `${mins}m`
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}

const getDriverName = (d: Dispatch) => typeof d.driver === 'object' ? d.driver.fullName : '—'
const getTaxiNumber = (d: Dispatch) => typeof d.taxiUnit === 'object' ? d.taxiUnit.taxiNumber : '—'
</script>

<template>
  <NuxtLayout name="default">
    <div class="p-6 space-y-5 animate-fadeIn">
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-white">Dispatches</h1>
          <p class="text-sm text-slate-400 mt-0.5">Manage all taxi dispatch records</p>
        </div>
        <NuxtLink to="/dispatches/new" class="btn-primary">
          <UIcon name="i-heroicons-plus" class="w-4 h-4" /> New Dispatch
        </NuxtLink>
      </div>

      <!-- Filters -->
      <div class="glass-card p-4 flex flex-col sm:flex-row gap-3">
        <div class="relative flex-1">
          <UIcon name="i-heroicons-magnifying-glass" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input v-model="search" type="text" class="form-input pl-9" placeholder="Search by number, passenger, location..." />
        </div>
        <select v-model="statusFilter" class="form-input w-full sm:w-44">
          <option value="">All Status</option>
          <option value="Active">Active</option>
          <option value="Completed">Completed</option>
          <option value="Cancelled">Cancelled</option>
        </select>
      </div>

      <!-- Table -->
      <div class="glass-card overflow-hidden">
        <div v-if="dispatchStore.loading" class="p-10 text-center">
          <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 text-green-500 animate-spin mx-auto" />
        </div>
        <div v-else-if="!dispatchStore.dispatches.length" class="p-16 text-center">
          <UIcon name="i-heroicons-map-pin" class="w-12 h-12 text-slate-700 mx-auto mb-3" />
          <p class="text-slate-400 font-medium">No dispatches found</p>
          <NuxtLink to="/dispatches/new" class="btn-primary inline-flex mt-4">Create First Dispatch</NuxtLink>
        </div>
        <div v-else>
          <div class="overflow-x-auto">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Dispatch #</th>
                  <th>Passenger</th>
                  <th>Driver / Taxi</th>
                  <th>Route</th>
                  <th>Departure</th>
                  <th>Duration</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="d in dispatchStore.dispatches" :key="d._id">
                  <td><span class="font-mono text-xs text-green-400">{{ d.dispatchNumber }}</span></td>
                  <td class="text-white font-medium">{{ d.passengerName }}</td>
                  <td>
                    <p class="text-white text-sm">{{ getDriverName(d) }}</p>
                    <p class="text-slate-500 text-xs">{{ getTaxiNumber(d) }}</p>
                  </td>
                  <td>
                    <div class="flex items-start gap-1.5 max-w-[180px]">
                      <div class="flex flex-col items-center gap-0.5 shrink-0 mt-1">
                        <div class="w-2 h-2 rounded-full bg-green-500" />
                        <div class="w-0.5 h-3 bg-slate-600" />
                        <div class="w-2 h-2 rounded-full bg-blue-500" />
                      </div>
                      <div>
                        <p class="text-xs text-slate-300 truncate">{{ d.pickupLocation }}</p>
                        <p class="text-xs text-slate-400 truncate mt-1">{{ d.destination }}</p>
                      </div>
                    </div>
                  </td>
                  <td class="text-slate-400 text-xs whitespace-nowrap">{{ formatDateTime(d.departureTime) }}</td>
                  <td class="text-slate-400 text-xs">{{ formatDuration(d.tripDuration) }}</td>
                  <td>
                    <span :class="[
                      'px-2 py-0.5 rounded-full text-xs font-medium',
                      d.status === 'Active' ? 'badge-active' : d.status === 'Completed' ? 'badge-completed' : 'badge-cancelled'
                    ]">{{ d.status }}</span>
                  </td>
                  <td>
                    <div v-if="d.status === 'Active'" class="flex items-center gap-1.5">
                      <button class="p-1.5 rounded-lg hover:bg-green-500/10 transition-colors" title="Complete" @click="openComplete(d)">
                        <UIcon name="i-heroicons-check" class="w-4 h-4 text-green-400" />
                      </button>
                      <button class="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors" title="Cancel" @click="openCancel(d)">
                        <UIcon name="i-heroicons-x-mark" class="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                    <span v-else class="text-slate-600 text-xs">—</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination -->
          <div v-if="dispatchStore.pagination && dispatchStore.pagination.pages > 1" class="flex items-center justify-between px-5 py-4 border-t" style="border-color: rgba(255,255,255,0.06);">
            <p class="text-xs text-slate-500">{{ dispatchStore.pagination.total }} total dispatches</p>
            <div class="flex gap-2">
              <button :disabled="page <= 1" class="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40" @click="page--">
                <UIcon name="i-heroicons-chevron-left" class="w-4 h-4" />
              </button>
              <button :disabled="page >= dispatchStore.pagination.pages" class="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40" @click="page++">
                <UIcon name="i-heroicons-chevron-right" class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Complete Modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showCompleteModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="showCompleteModal = false" />
          <div class="relative glass-card p-6 max-w-sm w-full animate-fadeIn">
            <div class="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
              <UIcon name="i-heroicons-check-circle" class="w-6 h-6 text-green-400" />
            </div>
            <h3 class="text-lg font-bold text-white text-center mb-1">Complete Dispatch</h3>
            <p class="text-slate-400 text-sm text-center mb-4">{{ selectedDispatch?.dispatchNumber }}</p>
            <div class="mb-4">
              <label class="form-label">Remarks (optional)</label>
              <textarea v-model="actionRemarks" class="form-input h-20 resize-none" placeholder="Add any notes..." />
            </div>
            <div class="flex gap-3">
              <button class="btn-secondary flex-1" @click="showCompleteModal = false">Cancel</button>
              <button class="btn-primary flex-1" :disabled="actionLoading" @click="handleComplete">
                <UIcon v-if="actionLoading" name="i-heroicons-arrow-path" class="w-4 h-4 animate-spin" />
                Complete Trip
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Cancel Modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showCancelModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="showCancelModal = false" />
          <div class="relative glass-card p-6 max-w-sm w-full animate-fadeIn">
            <div class="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <UIcon name="i-heroicons-x-circle" class="w-6 h-6 text-red-400" />
            </div>
            <h3 class="text-lg font-bold text-white text-center mb-1">Cancel Dispatch</h3>
            <p class="text-slate-400 text-sm text-center mb-4">{{ selectedDispatch?.dispatchNumber }}</p>
            <div class="mb-4">
              <label class="form-label">Reason for cancellation</label>
              <textarea v-model="actionRemarks" class="form-input h-20 resize-none" placeholder="State the reason..." />
            </div>
            <div class="flex gap-3">
              <button class="btn-secondary flex-1" @click="showCancelModal = false">Back</button>
              <button class="btn-primary flex-1" style="background: linear-gradient(135deg, #dc2626, #991b1b);" :disabled="actionLoading" @click="handleCancel">
                <UIcon v-if="actionLoading" name="i-heroicons-arrow-path" class="w-4 h-4 animate-spin" />
                Cancel Dispatch
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </NuxtLayout>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
