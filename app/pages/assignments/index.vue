<script setup lang="ts">
import { useAssignmentStore } from '~/stores/assignments'
import { assignmentIssueSchema } from '~~/shared/utils/validations'
import { useFormValidation } from '~/composables/useFormValidation'
import { calculateBoundary, formatTaxiType, formatBoundaryCurrency, type BoundaryCalculationResult } from '~~/shared/utils/boundary'
import type { TaxiType } from '~/types'


definePageMeta({ layout: 'default', middleware: 'auth' })
useHead({ title: 'Taxi Assignment — EFE Taxi Dispatch System' })

const assignmentStore = useAssignmentStore()
const authStore = useAuthStore()
const toast = useToast()

// --- Issue Form ---
const showIssueModal = ref(false)
const issueForm = reactive({ driverId: '', taxiUnitId: '', remarks: '' })
const { errors: issueErrors, validate: validateIssue, touch: touchIssue, clearErrors: clearIssueErrors, setErrors: setIssueErrors } = useFormValidation(assignmentIssueSchema, issueForm)
const issuingTaxi = ref(false)
const issueError = ref('')
const showDriverBioModal = ref(false)

// Computed: the driver currently selected in the issue form
const selectedDriver = computed(() => availableDrivers.value.find(d => d._id === issueForm.driverId))

// --- Return Modal ---
const showReturnModal = ref(false)
const showReturnBioModal = ref(false)
const selectedAssignment = ref<(typeof assignmentStore.activeAssignments)[0] | null>(null)
const returnRemarks = ref('')
const returningTaxi = ref(false)
const returnError = ref('')

const returnDriverId = computed(() => {
  if (!selectedAssignment.value?.driver) return ''
  return typeof selectedAssignment.value.driver === 'object'
    ? (selectedAssignment.value.driver as any)._id
    : selectedAssignment.value.driver
})

const returnDriverName = computed(() => {
  if (!selectedAssignment.value) return 'Driver'
  return getDriverName(selectedAssignment.value)
})

// --- Active Assignments Pagination ---
const activePage = ref(1)
const activeLimit = 10

const paginatedActiveAssignments = computed(() => {
  const start = (activePage.value - 1) * activeLimit
  const end = start + activeLimit
  return assignmentStore.activeAssignments.slice(start, end)
})

const totalActivePages = computed(() => Math.ceil(assignmentStore.activeAssignments.length / activeLimit))

watch(() => assignmentStore.activeAssignments.length, (newLength) => {
  const maxPage = Math.ceil(newLength / activeLimit)
  if (activePage.value > maxPage && maxPage > 0) {
    activePage.value = maxPage
  }
})

// --- History Filters ---
const historyPage = ref(1)
const statusFilter = ref('')

// --- Search ---
const searchQuery = ref('')
const debouncedSearch = ref('')
let debounceTimer: ReturnType<typeof setTimeout>

watch(searchQuery, (val) => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    debouncedSearch.value = val
    historyPage.value = 1
  }, 300)
})

// --- Available Drivers & Taxis for issue form ---
const availableDrivers = ref<{ _id: string; fullName: string; driverId: string; biometric?: { enrolled: boolean } }[]>([])
const availableTaxis = ref<{ _id: string; taxiNumber: string; plateNumber: string; brand: string; model: string; taxiType?: TaxiType }[]>([])

const showDispatcherEnrollModal = ref(false)

const canIssue = computed(() => ['dispatcher', 'admin'].includes(authStore.user?.role || ''))

const loadData = async () => {
  await assignmentStore.fetchActive()
  await assignmentStore.fetchAll({ 
    page: historyPage.value, 
    limit: 15, 
    ...statusFilter.value ? { status: statusFilter.value } : {},
    ...debouncedSearch.value ? { search: debouncedSearch.value } : {}
  })
}

const loadFormData = async () => {
  const [driversRes, taxisRes] = await Promise.all([
    $fetch<{ data: typeof availableDrivers.value }>('/api/drivers', { query: { operationalStatus: 'Available', employmentStatus: 'Active', limit: 200 } }),
    $fetch<{ data: typeof availableTaxis.value }>('/api/taxi-units', { query: { status: 'Available', limit: 200 } })
  ])
  availableDrivers.value = driversRes.data
  availableTaxis.value = taxisRes.data
}

let timerInterval: ReturnType<typeof setInterval>
const currentTime = ref(Date.now())

onMounted(() => {
  loadData()
  timerInterval = setInterval(() => { currentTime.value = Date.now() }, 1000)
})

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval)
})

watch([historyPage, statusFilter, debouncedSearch], loadData)

const openIssueModal = async () => {
  issueForm.driverId = ''
  issueForm.taxiUnitId = ''
  issueForm.remarks = ''
  issueError.value = ''
  clearIssueErrors()
  await loadFormData()
  showIssueModal.value = true
}

const handleIssue = async () => {
  if (!validateIssue()) return

  issueError.value = ''

  // Verify a driver is selected
  if (!selectedDriver.value) {
    issueError.value = 'Please select a driver first.'
    return
  }

  // Check DRIVER biometric enrollment (driver must have fingerprint registered)
  if (!selectedDriver.value.biometric?.enrolled) {
    issueError.value = `Driver ${selectedDriver.value.fullName} has not enrolled their fingerprint. Please register biometrics in the driver profile first.`
    toast.add({
      title: 'Driver Biometric Required',
      description: `${selectedDriver.value.fullName} must register their fingerprint before dispatch.`,
      color: 'warning'
    })
    return
  }

  // Open Biometric Authentication Modal for DRIVER Verification via DigitalPersona 4500
  showDriverBioModal.value = true
}

const onDispatcherEnrollSuccess = async () => {
  showDispatcherEnrollModal.value = false
  await authStore.fetchCurrentUser()
  issueError.value = ''
  toast.add({
    title: 'Biometric Enrolled Successfully',
    description: 'Your fingerprint is now registered. Please scan your finger to authorize the dispatch.',
    color: 'success'
  })
  // Immediately proceed to biometric authorization
  showDriverBioModal.value = true
}

const onDriverBioSuccess = async ({ biometricToken }: { user?: any; biometricToken: string }) => {
  issuingTaxi.value = true
  issueError.value = ''
  try {
    await assignmentStore.issueTaxi(issueForm.driverId, issueForm.taxiUnitId, issueForm.remarks, biometricToken)
    toast.add({ title: '🚕 Taxi issued successfully!', description: `Driver fingerprint verified. ${selectedDriver.value?.fullName || 'Driver'} is now active.`, color: 'success' })
    showIssueModal.value = false
    showDriverBioModal.value = false
    await loadData()
  } catch (err: any) {
    issueError.value = err?.data?.message || err?.message || 'Failed to issue taxi'
    if (err?.data?.data?.errors) {
      setIssueErrors(err.data.data.errors)
    }
    toast.add({ title: 'Failed to issue taxi', description: issueError.value, color: 'error' })
  } finally {
    issuingTaxi.value = false
  }
}

const openReturnModal = (assignment: (typeof assignmentStore.activeAssignments)[0]) => {
  selectedAssignment.value = assignment
  returnRemarks.value = ''
  returnError.value = ''
  showReturnModal.value = true
}

const handleReturn = async () => {
  returnError.value = ''
  if (!selectedAssignment.value) return

  // Check driver biometric enrollment if known
  if (
    typeof selectedAssignment.value.driver === 'object' &&
    (selectedAssignment.value.driver as any).biometric?.enrolled === false
  ) {
    returnError.value = `Driver ${returnDriverName.value} has not enrolled their fingerprint. Please register biometrics in the driver profile first.`
    toast.add({
      title: 'Driver Biometric Required',
      description: `${returnDriverName.value} must register their fingerprint before vehicle return can be processed.`,
      color: 'warning'
    })
    return
  }

  // Open Biometric Authentication Modal for DRIVER verification on return
  showReturnBioModal.value = true
}

const onReturnBioSuccess = async ({ biometricToken }: { user?: any; biometricToken: string }) => {
  returningTaxi.value = true
  returnError.value = ''
  try {
    const result = await assignmentStore.returnTaxi(selectedAssignment.value!._id, returnRemarks.value, biometricToken) as any
    const hours = Math.floor(result.totalMinutes / 60)
    const mins = result.totalMinutes % 60
    toast.add({ 
      title: '✅ Taxi returned successfully!', 
      description: `Driver ${returnDriverName.value} fingerprint verified. Boundary: ${formatBoundaryCurrency(result.boundary)} • Hours worked: ${hours}h ${mins}m`, 
      color: 'success' 
    })
    showReturnBioModal.value = false
    showReturnModal.value = false
    await loadData()
  } catch (err: any) {
    returnError.value = err?.data?.message || err?.message || 'Failed to return taxi'
    toast.add({ title: 'Failed to return taxi', description: returnError.value, color: 'error' })
  } finally {
    returningTaxi.value = false
  }
}

const getDriverName = (a: (typeof assignmentStore.activeAssignments)[0]) =>
  (typeof a.driver === 'object' && a.driver !== null) ? (a.driver as any).fullName : '—'
const getTaxiNumber = (a: (typeof assignmentStore.activeAssignments)[0]) =>
  (typeof a.taxiUnit === 'object' && a.taxiUnit !== null) ? (a.taxiUnit as any).taxiNumber : '—'
const getTaxiPlate = (a: (typeof assignmentStore.activeAssignments)[0]) =>
  (typeof a.taxiUnit === 'object' && a.taxiUnit !== null) ? (a.taxiUnit as any).plateNumber : '—'
const getIssuedBy = (a: (typeof assignmentStore.activeAssignments)[0]) =>
  (typeof a.issuedBy === 'object' && a.issuedBy !== null) ? (a.issuedBy as any).fullName : '—'

const getTaxiType = (a: any): TaxiType => {
  if (!a || !a.taxiUnit) return 'BATMAN'
  if (typeof a.taxiUnit === 'object' && a.taxiUnit !== null && a.taxiUnit.taxiType) {
    return a.taxiUnit.taxiType
  }
  return 'BATMAN'
}

const getActiveBoundaryCalc = (a: any): BoundaryCalculationResult => {
  return calculateBoundary(getTaxiType(a), a.timeIn, currentTime.value)
}

const selectedReturnBoundary = computed<BoundaryCalculationResult | null>(() => {
  if (!selectedAssignment.value) return null
  return calculateBoundary(getTaxiType(selectedAssignment.value), selectedAssignment.value.timeIn, currentTime.value)
})

const formatTime = (d: string) => new Date(d).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: true })
const formatDate = (d: string) => new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
const formatDateTime = (d: string) => `${formatDate(d)} ${formatTime(d)}`
const formatDuration = (mins: number | null) => {
  if (mins === null || mins === undefined) return '—'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

const getRemainingGraceMs = (timeIn: string) => {
  const diffMs = currentTime.value - new Date(timeIn).getTime()
  return (15 * 60000) - diffMs
}

const formatGraceRemaining = (ms: number) => {
  const m = Math.floor(ms / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

const formatDutyTime = (timeIn: string) => {
  const diffMs = currentTime.value - new Date(timeIn).getTime()
  const gracePeriodMs = 15 * 60000
  const dutyMs = Math.max(0, diffMs - gracePeriodMs)
  const h = Math.floor(dutyMs / 3600000)
  const m = Math.floor((dutyMs % 3600000) / 60000)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}
</script>

<template>
    <div class="p-6 space-y-6 animate-fadeIn">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-white">Taxi Assignment</h1>
          <p class="text-sm text-slate-400 mt-0.5">Issue and receive taxi units from drivers</p>
        </div>
        <button v-if="canIssue" class="btn-primary" @click="openIssueModal">
          <UIcon name="i-heroicons-plus" class="w-4 h-4" />
          Issue Taxi
        </button>
      </div>

      <!-- Summary Cards -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="stat-card">
          <div class="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style="background: rgba(34,197,94,0.12);">
            <UIcon name="i-heroicons-user-group" class="w-5 h-5" style="color: #4ade80;" />
          </div>
          <div class="text-2xl font-bold text-white">{{ assignmentStore.activeAssignments.length }}</div>
          <div class="text-xs text-slate-400 mt-1">Drivers On Duty</div>
        </div>
        <div class="stat-card">
          <div class="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style="background: rgba(249,168,37,0.12);">
            <UIcon name="i-lucide-car-taxi-front" class="w-5 h-5" style="color: #f9a825;" />
          </div>
          <div class="text-2xl font-bold text-white">{{ assignmentStore.activeAssignments.length }}</div>
          <div class="text-xs text-slate-400 mt-1">Taxis In Use</div>
        </div>
        <div class="stat-card">
          <div class="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style="background: rgba(96,165,250,0.12);">
            <UIcon name="i-heroicons-clock" class="w-5 h-5" style="color: #60a5fa;" />
          </div>
          <div class="text-2xl font-bold text-white">
            {{ assignmentStore.assignments.filter(a => a.status === 'Completed').length }}
          </div>
          <div class="text-xs text-slate-400 mt-1">Completed Today</div>
        </div>
        <div class="stat-card">
          <div class="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style="background: rgba(167,139,250,0.12);">
            <UIcon name="i-heroicons-clipboard-document-check" class="w-5 h-5" style="color: #a78bfa;" />
          </div>
          <div class="text-2xl font-bold text-white">{{ assignmentStore.assignments.length }}</div>
          <div class="text-xs text-slate-400 mt-1">Total Assignments</div>
        </div>
      </div>

      <!-- Active Assignments -->
      <div class="glass-card overflow-hidden">
        <div class="px-5 py-4 border-b flex items-center justify-between" style="border-color: rgba(255,255,255,0.06);">
          <div>
            <h2 class="text-base font-semibold text-white flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              Active Assignments
            </h2>
            <p class="text-xs text-slate-500 mt-0.5">Drivers currently on duty</p>
          </div>
          <span class="px-2.5 py-1 rounded-full text-xs font-bold" style="background: rgba(34,197,94,0.15); color: #4ade80;">
            {{ assignmentStore.activeAssignments.length }} active
          </span>
        </div>

        <div v-if="assignmentStore.loading" class="p-10 text-center">
          <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 text-green-500 animate-spin mx-auto" />
        </div>
        <div v-else-if="!assignmentStore.activeAssignments.length" class="p-12 text-center">
          <UIcon name="i-lucide-car-taxi-front" class="w-12 h-12 text-slate-700 mx-auto mb-3" />
          <p class="text-slate-400 font-medium">No active assignments</p>
          <p class="text-slate-600 text-sm mt-1">Issue a taxi to get started</p>
        </div>
        <div v-else class="overflow-x-auto">
          <table class="data-table">
            <thead>
              <tr>
                <th>Assignment #</th>
                <th>Driver</th>
                <th>Taxi Unit</th>
                <th>Type</th>
                <th>Issued By</th>
                <th>Time In</th>
                <th>Elapsed</th>
                <th>Boundary</th>
                <th>Overtime</th>
                <th>Notes</th>
                <th v-if="canIssue">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="a in paginatedActiveAssignments" :key="a._id">
                <td><span class="font-mono text-xs text-green-400">{{ a.assignmentNumber }}</span></td>
                <td>
                  <p class="text-white font-medium text-sm">{{ getDriverName(a) }}</p>
                  <p class="text-slate-500 text-xs">{{ (typeof a.driver === 'object' && a.driver !== null) ? (a.driver as any).driverId : '' }}</p>
                </td>
                <td>
                  <p class="text-white text-sm font-medium">{{ getTaxiNumber(a) }}</p>
                  <p class="text-slate-500 text-xs font-mono">{{ getTaxiPlate(a) }}</p>
                </td>
                <td>
                  <span
                    :class="[
                      'px-2.5 py-0.5 rounded-full text-xs font-semibold border',
                      getTaxiType(a) === 'SUPERMAN'
                        ? 'bg-blue-500/15 text-blue-400 border-blue-500/25'
                        : 'bg-amber-500/15 text-amber-400 border-amber-500/25'
                    ]"
                  >
                    {{ formatTaxiType(getTaxiType(a)) }}
                  </span>
                </td>
                <td class="text-slate-400 text-sm">{{ getIssuedBy(a) }}</td>
                <td class="text-slate-400 text-xs whitespace-nowrap">{{ formatTime(a.timeIn) }}</td>
                <td>
                  <div v-if="getRemainingGraceMs(a.timeIn) > 0">
                    <div class="text-[10px] text-amber-500 font-bold uppercase tracking-wider mb-0.5">Grace Period</div>
                    <div class="font-mono text-xs text-slate-300">{{ formatGraceRemaining(getRemainingGraceMs(a.timeIn)) }} left</div>
                  </div>
                  <div v-else>
                    <div class="text-[10px] text-green-500 font-bold uppercase tracking-wider mb-0.5">On Duty</div>
                    <div class="font-mono text-xs text-green-400">{{ formatDutyTime(a.timeIn) }}</div>
                  </div>
                </td>
                <td>
                  <div>
                    <span
                      class="font-mono text-xs font-bold"
                      :class="getActiveBoundaryCalc(a).boundary > 0 ? 'text-amber-400' : 'text-slate-400'"
                    >
                      {{ formatBoundaryCurrency(getActiveBoundaryCalc(a).boundary) }}
                    </span>
                    <span v-if="getActiveBoundaryCalc(a).elapsedHours < 16" class="text-[10px] text-slate-500 block">
                      &lt; 16 hrs
                    </span>
                    <span v-else class="text-[10px] text-slate-400 block">
                      Base: ₱{{ getActiveBoundaryCalc(a).baseBoundary }}
                    </span>
                  </div>
                </td>
                <td>
                  <div v-if="getActiveBoundaryCalc(a).overtimeHours > 0">
                    <span class="font-mono text-xs font-semibold text-purple-400">
                      +{{ getActiveBoundaryCalc(a).overtimeHours }}h
                    </span>
                    <span class="text-[10px] text-purple-300 block">
                      (+₱{{ getActiveBoundaryCalc(a).overtimeHours * 100 }})
                    </span>
                  </div>
                  <div v-else>
                    <span class="font-mono text-xs text-slate-500">0h</span>
                  </div>
                </td>
                <td>
                  <NotesViewer :content="a.remarks" title="Assignment Notes" />
                </td>
                <td v-if="canIssue">
                  <button
                    class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                    style="background: rgba(239,68,68,0.12); color: #f87171; border: 1px solid rgba(239,68,68,0.2);"
                    @click="openReturnModal(a)"
                  >
                    <UIcon name="i-heroicons-arrow-uturn-left" class="w-3.5 h-3.5 inline mr-1" />
                    Return Taxi
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <!-- Active Assignments Pagination -->
        <div v-if="totalActivePages > 1" class="flex items-center justify-between px-5 py-4 border-t" style="border-color: rgba(255,255,255,0.06);">
          <p class="text-xs text-slate-500">{{ assignmentStore.activeCount }} total active assignments</p>
          <div class="flex gap-2">
            <button :disabled="activePage <= 1" class="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40" @click="activePage--">
              <UIcon name="i-heroicons-chevron-left" class="w-4 h-4" />
            </button>
            <span class="text-xs text-slate-400 self-center px-2">{{ activePage }} / {{ totalActivePages }}</span>
            <button :disabled="activePage >= totalActivePages" class="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40" @click="activePage++">
              <UIcon name="i-heroicons-chevron-right" class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <!-- Assignment History -->
      <div class="glass-card overflow-hidden">
        <div class="px-5 py-4 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3" style="border-color: rgba(255,255,255,0.06);">
          <div>
            <h2 class="text-base font-semibold text-white">Assignment History</h2>
            <p class="text-xs text-slate-500 mt-0.5">All taxi assignment records</p>
          </div>
          <div class="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <div class="relative w-full sm:w-80">
              <UIcon name="i-heroicons-magnifying-glass" class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input 
                v-model="searchQuery"
                type="text" 
                class="form-input w-full !pl-10 pr-3 text-xs" 
                placeholder="Search by assignment number, driver, taxi, dispatcher, remarks..."
              />
            </div>
            <select v-model="statusFilter" class="form-input w-full sm:w-40 text-xs">
              <option value="">All Status</option>
              <option value="Active">Active</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
        </div>

        <div v-if="assignmentStore.loading" class="p-10 text-center">
          <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 text-green-500 animate-spin mx-auto" />
        </div>
        <div v-else-if="!assignmentStore.assignments.length" class="p-12 text-center">
          <UIcon name="i-heroicons-clipboard-document-list" class="w-12 h-12 text-slate-700 mx-auto mb-3" />
          <p class="text-slate-400 font-medium">
            {{ debouncedSearch ? 'No assignment history found.' : 'No assignment records found' }}
          </p>
          <p v-if="debouncedSearch" class="text-slate-500 text-xs mt-1">Try searching using a different keyword.</p>
        </div>
        <div v-else>
          <div class="overflow-x-auto">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Assignment #</th>
                  <th>Driver</th>
                  <th>Taxi</th>
                  <th>Type</th>
                  <th>Issued By</th>
                  <th>Date</th>
                  <th>Time In</th>
                  <th>Time Out</th>
                  <th>Hours</th>
                  <th>Boundary</th>
                  <th>Notes</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="a in assignmentStore.assignments" :key="a._id">
                  <td><span class="font-mono text-xs text-green-400">{{ a.assignmentNumber }}</span></td>
                  <td class="text-white font-medium text-sm">{{ getDriverName(a) }}</td>
                  <td>
                    <p class="text-white text-sm">{{ getTaxiNumber(a) }}</p>
                    <p class="text-slate-500 text-xs font-mono">{{ getTaxiPlate(a) }}</p>
                  </td>
                  <td>
                    <span
                      :class="[
                        'px-2 py-0.5 rounded-full text-xs font-semibold border',
                        getTaxiType(a) === 'SUPERMAN'
                          ? 'bg-blue-500/15 text-blue-400 border-blue-500/25'
                          : 'bg-amber-500/15 text-amber-400 border-amber-500/25'
                      ]"
                    >
                      {{ formatTaxiType(getTaxiType(a)) }}
                    </span>
                  </td>
                  <td class="text-slate-400 text-sm">{{ getIssuedBy(a) }}</td>
                  <td class="text-slate-400 text-xs whitespace-nowrap">{{ formatDate(a.assignedAt) }}</td>
                  <td class="text-slate-400 text-xs whitespace-nowrap">{{ formatTime(a.timeIn) }}</td>
                  <td class="text-slate-400 text-xs whitespace-nowrap">
                    <template v-if="a.timeOut">
                      {{ formatDate(a.timeOut) }} • {{ formatTime(a.timeOut) }}
                    </template>
                    <template v-else>—</template>
                  </td>
                  <td class="text-xs font-mono" :style="{ color: a.totalHours ? '#f9a825' : '#64748b' }">
                    {{ formatDuration(a.totalMinutes) }}
                  </td>
                  <td class="text-xs font-mono">
                    <span v-if="a.status === 'Completed'" class="font-bold text-amber-400">
                      {{ formatBoundaryCurrency(a.boundary) }}
                    </span>
                    <span v-else class="text-slate-500">—</span>
                  </td>
                  <td>
                    <NotesViewer :content="a.remarks" title="Assignment Notes" />
                  </td>
                  <td>
                    <span :class="[
                      'px-2 py-0.5 rounded-full text-xs font-medium',
                      a.status === 'Active' ? 'badge-active' : 'badge-completed'
                    ]">{{ a.status }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination -->
          <div v-if="assignmentStore.pagination && assignmentStore.pagination.pages > 1" class="flex items-center justify-between px-5 py-4 border-t" style="border-color: rgba(255,255,255,0.06);">
            <p class="text-xs text-slate-500">{{ assignmentStore.pagination.total }} total records</p>
            <div class="flex gap-2">
              <button :disabled="historyPage <= 1" class="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40" @click="historyPage--">
                <UIcon name="i-heroicons-chevron-left" class="w-4 h-4" />
              </button>
              <span class="text-xs text-slate-400 self-center px-2">{{ historyPage }} / {{ assignmentStore.pagination.pages }}</span>
              <button :disabled="historyPage >= assignmentStore.pagination.pages" class="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40" @click="historyPage++">
                <UIcon name="i-heroicons-chevron-right" class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Issue Taxi Modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showIssueModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="showIssueModal = false" />
          <div class="relative glass-card p-6 max-w-md w-full animate-fadeIn" style="background: rgba(17,24,39,0.97);">
            <div class="flex items-center gap-3 mb-6">
              <div class="w-10 h-10 rounded-xl flex items-center justify-center" style="background: rgba(34,197,94,0.15);">
                <UIcon name="i-lucide-car-taxi-front" class="w-5 h-5 text-green-400" />
              </div>
              <div>
                <h3 class="text-lg font-bold text-white">Issue Taxi</h3>
                <p class="text-xs text-slate-400">Assign an available taxi to a driver</p>
              </div>
            </div>

            <div class="space-y-4">
              <div v-if="issueError" class="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2">
                <UIcon name="i-heroicons-exclamation-circle" class="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div class="flex-1">
                  <p class="text-sm text-red-400 font-medium">{{ issueError }}</p>
                  <button
                    v-if="!authStore.user?.biometric?.enrolled"
                    type="button"
                    class="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-300 hover:text-amber-200 underline"
                    @click="showDispatcherEnrollModal = true"
                  >
                    <UIcon name="i-heroicons-finger-print" class="w-4 h-4" />
                    Register your fingerprint now on the reader →
                  </button>
                </div>
              </div>

              <!-- Unregistered Biometric Alert Box -->
              <div v-if="!authStore.user?.biometric?.enrolled" class="p-3 bg-amber-500/10 border border-amber-500/25 rounded-lg flex items-center justify-between gap-3">
                <div class="flex items-center gap-2.5">
                  <UIcon name="i-heroicons-finger-print" class="w-5 h-5 text-amber-400 shrink-0" />
                  <div>
                    <p class="text-xs font-semibold text-amber-300">Biometric Registration Required</p>
                    <p class="text-[11px] text-slate-400">Your account needs a registered fingerprint to authorize taxi dispatches.</p>
                  </div>
                </div>
                <button
                  type="button"
                  class="btn-secondary text-xs px-2.5 py-1 text-amber-300 border-amber-500/30 hover:bg-amber-500/20 shrink-0"
                  @click="showDispatcherEnrollModal = true"
                >
                  Enroll Now
                </button>
              </div>
              <div>
                <label class="form-label">Select Driver *</label>
                <select v-model="issueForm.driverId" @blur="touchIssue('driverId')" class="form-input" :class="{ 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20': issueErrors.driverId }">
                  <option value="">— Select Available Driver —</option>
                  <option v-for="d in availableDrivers" :key="d._id" :value="d._id">
                    {{ d.fullName }} ({{ d.driverId }})
                  </option>
                </select>
                <p v-if="issueErrors.driverId" class="mt-1 text-xs text-red-400">{{ issueErrors.driverId }}</p>
                <p v-else-if="!availableDrivers.length" class="text-xs text-amber-400 mt-1">No available drivers at this time</p>
              </div>

              <div>
                <label class="form-label">Select Taxi Unit *</label>
                <select v-model="issueForm.taxiUnitId" @blur="touchIssue('taxiUnitId')" class="form-input" :class="{ 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20': issueErrors.taxiUnitId }">
                  <option value="">— Select Available Taxi —</option>
                  <option v-for="t in availableTaxis" :key="t._id" :value="t._id">
                    {{ t.taxiNumber }} — {{ t.plateNumber }} ({{ t.brand }} {{ t.model }}) • {{ formatTaxiType(t.taxiType) }} (₱{{ t.taxiType === 'SUPERMAN' ? '990' : '920' }} base)
                  </option>
                </select>
                <p v-if="issueErrors.taxiUnitId" class="mt-1 text-xs text-red-400">{{ issueErrors.taxiUnitId }}</p>
                <p v-else-if="!availableTaxis.length" class="text-xs text-amber-400 mt-1">No available taxis at this time</p>
              </div>

              <div>
                <label class="form-label">Notes <span class="text-slate-600">(optional)</span></label>
                <textarea v-model="issueForm.remarks" @blur="touchIssue('remarks')" class="form-input h-20 resize-none" :class="{ 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20': issueErrors.remarks }" placeholder="Add any notes..." />
                <p v-if="issueErrors.remarks" class="mt-1 text-xs text-red-400">{{ issueErrors.remarks }}</p>
              </div>

              <div class="p-3 rounded-lg text-xs" style="background: rgba(34,197,94,0.08); border: 1px solid rgba(34,197,94,0.15); color: #86efac;">
                <UIcon name="i-heroicons-information-circle" class="w-4 h-4 inline mr-1" />
                <strong>Time In</strong> will be automatically recorded as the current server time.
              </div>
            </div>

            <div class="flex gap-3 mt-6">
              <button class="btn-secondary flex-1" @click="showIssueModal = false">Cancel</button>
              <button class="btn-primary flex-1" :disabled="issuingTaxi || !issueForm.driverId || !issueForm.taxiUnitId" @click="handleIssue">
                <UIcon v-if="issuingTaxi" name="i-heroicons-arrow-path" class="w-4 h-4 animate-spin" />
                <UIcon v-else name="i-heroicons-check" class="w-4 h-4" />
                {{ issuingTaxi ? 'Issuing...' : 'Issue Taxi' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Return Taxi Modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showReturnModal && selectedAssignment" class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="showReturnModal = false" />
          <div class="relative glass-card p-6 max-w-md w-full animate-fadeIn" style="background: rgba(17,24,39,0.97);">
            <div class="flex items-center gap-3 mb-5">
              <div class="w-10 h-10 rounded-xl flex items-center justify-center" style="background: rgba(239,68,68,0.12);">
                <UIcon name="i-heroicons-arrow-uturn-left" class="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 class="text-lg font-bold text-white">Return Taxi</h3>
                <p class="text-xs text-slate-400">{{ selectedAssignment.assignmentNumber }}</p>
              </div>
            </div>

            <div v-if="returnError" class="p-3 mb-5 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2">
              <UIcon name="i-heroicons-exclamation-circle" class="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <p class="text-sm text-red-400 font-medium">{{ returnError }}</p>
            </div>

            <div class="glass-card p-4 mb-4 space-y-2" style="background: rgba(255,255,255,0.03);">
              <div class="flex justify-between text-sm">
                <span class="text-slate-400">Driver</span>
                <span class="text-white font-medium">{{ getDriverName(selectedAssignment) }}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-slate-400">Taxi</span>
                <span class="text-white font-medium">{{ getTaxiNumber(selectedAssignment) }} ({{ getTaxiPlate(selectedAssignment) }})</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-slate-400">Taxi Type</span>
                <span
                  :class="[
                    'px-2 py-0.5 rounded-full text-xs font-semibold border',
                    getTaxiType(selectedAssignment) === 'SUPERMAN'
                      ? 'bg-blue-500/15 text-blue-400 border-blue-500/25'
                      : 'bg-amber-500/15 text-amber-400 border-amber-500/25'
                  ]"
                >
                  {{ formatTaxiType(getTaxiType(selectedAssignment)) }}
                </span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-slate-400">Time In</span>
                <span class="text-white">{{ formatTime(selectedAssignment.timeIn) }}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-slate-400">Grace Period</span>
                <span v-if="getRemainingGraceMs(selectedAssignment.timeIn) > 0" class="text-amber-500 font-mono text-xs">
                  {{ formatGraceRemaining(getRemainingGraceMs(selectedAssignment.timeIn)) }} left
                </span>
                <span v-else class="text-slate-500 text-xs">Completed</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-slate-400">Duty Time</span>
                <span style="color: #4ade80;" class="font-mono font-bold">{{ formatDutyTime(selectedAssignment.timeIn) }}</span>
              </div>
              <div v-if="selectedReturnBoundary" class="flex justify-between text-sm pt-1 border-t border-white/5">
                <span class="text-slate-400">Overtime Hours</span>
                <span class="font-mono text-purple-400 font-semibold">
                  {{ selectedReturnBoundary.overtimeHours }}h
                  <span v-if="selectedReturnBoundary.overtimeHours > 0" class="text-xs text-purple-300">
                    (+₱{{ selectedReturnBoundary.overtimeHours * 100 }})
                  </span>
                </span>
              </div>
            </div>

            <!-- Boundary Computation Display -->
            <div v-if="selectedReturnBoundary" class="p-3.5 rounded-xl border mb-5 flex items-center justify-between" style="background: rgba(249,168,37,0.1); border-color: rgba(249,168,37,0.3);">
              <div>
                <span class="text-xs text-amber-300 font-semibold block uppercase tracking-wider">Calculated Boundary</span>
                <span class="text-xs text-slate-400">
                  {{ selectedReturnBoundary.elapsedHours < 16 ? 'Under 16 hours (₱0)' : (selectedReturnBoundary.overtimeHours > 0 ? `Base: ₱${selectedReturnBoundary.baseBoundary} + OT: ₱${selectedReturnBoundary.overtimeHours * 100}` : `Base boundary: ₱${selectedReturnBoundary.baseBoundary}`) }}
                </span>
              </div>
              <div class="text-xl font-bold font-mono text-amber-400">
                {{ formatBoundaryCurrency(selectedReturnBoundary.boundary) }}
              </div>
            </div>

            <div class="mb-5">
              <label class="form-label">Notes <span class="text-slate-600">(optional)</span></label>
              <textarea v-model="returnRemarks" class="form-input h-20 resize-none" placeholder="Add any notes..." />
            </div>

            <div class="p-3 rounded-lg text-xs mb-5" style="background: rgba(249,168,37,0.08); border: 1px solid rgba(249,168,37,0.15); color: #fde68a;">
              <UIcon name="i-heroicons-clock" class="w-4 h-4 inline mr-1" />
              <strong>Time Out</strong>, <strong>Hours Worked</strong>, and <strong>Boundary</strong> will be calculated automatically using server time.
            </div>

            <div class="p-3 rounded-lg text-xs mb-4" style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.2); color: #6ee7b7;">
              <UIcon name="i-heroicons-finger-print" class="w-4 h-4 inline mr-1 text-emerald-400" />
              <strong>Driver Biometric Verification:</strong> The assigned driver ({{ getDriverName(selectedAssignment) }}) must scan their fingerprint on the DigitalPersona reader to confirm and finalize this return.
            </div>

            <div class="flex gap-3">
              <button class="btn-secondary flex-1" @click="showReturnModal = false">Cancel</button>
              <button
                class="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all shadow-lg shadow-emerald-950/30"
                style="background: linear-gradient(135deg, #059669, #047857); color: white;"
                :disabled="returningTaxi"
                @click="handleReturn"
              >
                <UIcon v-if="returningTaxi" name="i-heroicons-arrow-path" class="w-4 h-4 animate-spin" />
                <UIcon v-else name="i-heroicons-finger-print" class="w-4 h-4" />
                {{ returningTaxi ? 'Processing...' : 'Verify Driver & Return' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Driver Biometric Authentication Modal (Issue) -->
    <BiometricAuthModal
      v-if="showDriverBioModal && selectedDriver"
      :user-id="selectedDriver._id"
      :user-name="selectedDriver.fullName"
      title="Driver Fingerprint Verification"
      :description="`${selectedDriver.fullName}, please place your finger on the DigitalPersona 4500 reader.`"
      mode="1:1"
      target-type="driver"
      @close="showDriverBioModal = false"
      @success="onDriverBioSuccess"
      @failed="(msg) => toast.add({ title: 'Driver fingerprint verification failed', description: 'The driver must scan their enrolled fingerprint to authorize dispatch.', color: 'error' })"
    />

    <!-- Driver Biometric Authentication Modal (Return) -->
    <BiometricAuthModal
      v-if="showReturnBioModal && returnDriverId"
      :user-id="returnDriverId"
      :user-name="returnDriverName"
      title="Driver Return Verification"
      :description="`${returnDriverName}, please place your finger on the DigitalPersona 4500 reader to confirm vehicle return.`"
      mode="1:1"
      target-type="driver"
      @close="showReturnBioModal = false"
      @success="onReturnBioSuccess"
      @failed="(msg) => toast.add({ title: 'Driver verification failed', description: 'The assigned driver must scan their enrolled fingerprint to complete the return.', color: 'error' })"
    />

    <!-- Dispatcher / Admin Biometric Enrollment Modal -->
    <BiometricEnrollModal
      v-if="showDispatcherEnrollModal && authStore.user"
      :user-id="authStore.user.userId"
      :user-name="authStore.user.fullName"
      target-type="user"
      @close="showDispatcherEnrollModal = false"
      @enrolled="onDispatcherEnrollSuccess"
    />
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
