<script setup lang="ts">
import { useAssignmentStore } from '~/stores/assignments'

definePageMeta({ layout: 'default', middleware: 'auth' })
useHead({ title: 'Taxi Assignment — EFE Taxi Dispatch System' })

const assignmentStore = useAssignmentStore()
const authStore = useAuthStore()
const toast = useToast()

// --- Issue Form ---
const showIssueModal = ref(false)
const issueForm = reactive({ driverId: '', taxiUnitId: '', remarks: '' })
const issuingTaxi = ref(false)

// --- Return Modal ---
const showReturnModal = ref(false)
const selectedAssignment = ref<(typeof assignmentStore.activeAssignments)[0] | null>(null)
const returnRemarks = ref('')
const returningTaxi = ref(false)

// --- History Filters ---
const historyPage = ref(1)
const statusFilter = ref('')

// --- Available Drivers & Taxis for issue form ---
const availableDrivers = ref<{ _id: string; fullName: string; driverId: string }[]>([])
const availableTaxis = ref<{ _id: string; taxiNumber: string; plateNumber: string; brand: string; model: string }[]>([])

const canIssue = computed(() => ['admin', 'dispatcher'].includes(authStore.user?.role || ''))

const loadData = async () => {
  await assignmentStore.fetchActive()
  await assignmentStore.fetchAll({ page: historyPage.value, limit: 15, ...statusFilter.value ? { status: statusFilter.value } : {} })
}

const loadFormData = async () => {
  const [driversRes, taxisRes] = await Promise.all([
    $fetch<{ data: typeof availableDrivers.value }>('/api/drivers', { query: { operationalStatus: 'Available', employmentStatus: 'Active', limit: 200 } }),
    $fetch<{ data: typeof availableTaxis.value }>('/api/taxi-units', { query: { status: 'Available', limit: 200 } })
  ])
  availableDrivers.value = driversRes.data
  availableTaxis.value = taxisRes.data
}

onMounted(loadData)
watch([historyPage, statusFilter], loadData)

const openIssueModal = async () => {
  issueForm.driverId = ''
  issueForm.taxiUnitId = ''
  issueForm.remarks = ''
  await loadFormData()
  showIssueModal.value = true
}

const handleIssue = async () => {
  if (!issueForm.driverId || !issueForm.taxiUnitId) {
    toast.add({ title: 'Please select both a driver and a taxi unit', color: 'error' })
    return
  }
  issuingTaxi.value = true
  try {
    await assignmentStore.issueTaxi(issueForm.driverId, issueForm.taxiUnitId, issueForm.remarks)
    toast.add({ title: '✅ Taxi issued successfully!', description: 'Driver is now active', color: 'success' })
    showIssueModal.value = false
    await loadData()
  } catch (err: any) {
    toast.add({ title: 'Failed to issue taxi', description: err?.data?.message || err?.message, color: 'error' })
  } finally {
    issuingTaxi.value = false
  }
}

const openReturnModal = (assignment: (typeof assignmentStore.activeAssignments)[0]) => {
  selectedAssignment.value = assignment
  returnRemarks.value = ''
  showReturnModal.value = true
}

const handleReturn = async () => {
  if (!selectedAssignment.value) return
  returningTaxi.value = true
  try {
    const result = await assignmentStore.returnTaxi(selectedAssignment.value._id, returnRemarks.value) as any
    const hours = Math.floor(result.totalMinutes / 60)
    const mins = result.totalMinutes % 60
    toast.add({ title: '✅ Taxi returned successfully!', description: `Hours worked: ${hours}h ${mins}m`, color: 'success' })
    showReturnModal.value = false
    await loadData()
  } catch (err: any) {
    toast.add({ title: 'Failed to return taxi', description: err?.data?.message || err?.message, color: 'error' })
  } finally {
    returningTaxi.value = false
  }
}

const getDriverName = (a: (typeof assignmentStore.activeAssignments)[0]) =>
  typeof a.driver === 'object' ? a.driver.fullName : '—'
const getTaxiNumber = (a: (typeof assignmentStore.activeAssignments)[0]) =>
  typeof a.taxiUnit === 'object' ? a.taxiUnit.taxiNumber : '—'
const getTaxiPlate = (a: (typeof assignmentStore.activeAssignments)[0]) =>
  typeof a.taxiUnit === 'object' ? a.taxiUnit.plateNumber : '—'
const getIssuedBy = (a: (typeof assignmentStore.activeAssignments)[0]) =>
  typeof a.issuedBy === 'object' ? a.issuedBy.fullName : '—'

const formatTime = (d: string) => new Date(d).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: true })
const formatDate = (d: string) => new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
const formatDateTime = (d: string) => `${formatDate(d)} ${formatTime(d)}`
const formatDuration = (mins: number | null) => {
  if (mins === null || mins === undefined) return '—'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

const elapsed = (timeIn: string) => {
  const diffMs = Date.now() - new Date(timeIn).getTime()
  const mins = Math.floor(diffMs / 60000)
  return formatDuration(mins)
}
</script>

<template>
  <NuxtLayout name="default">
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
            <UIcon name="i-heroicons-truck" class="w-5 h-5" style="color: #f9a825;" />
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
          <UIcon name="i-heroicons-truck" class="w-12 h-12 text-slate-700 mx-auto mb-3" />
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
                <th>Issued By</th>
                <th>Time In</th>
                <th>Elapsed</th>
                <th v-if="canIssue">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="a in assignmentStore.activeAssignments" :key="a._id">
                <td><span class="font-mono text-xs text-green-400">{{ a.assignmentNumber }}</span></td>
                <td>
                  <p class="text-white font-medium text-sm">{{ getDriverName(a) }}</p>
                  <p class="text-slate-500 text-xs">{{ typeof a.driver === 'object' ? a.driver.driverId : '' }}</p>
                </td>
                <td>
                  <p class="text-white text-sm font-medium">{{ getTaxiNumber(a) }}</p>
                  <p class="text-slate-500 text-xs font-mono">{{ getTaxiPlate(a) }}</p>
                </td>
                <td class="text-slate-400 text-sm">{{ getIssuedBy(a) }}</td>
                <td class="text-slate-400 text-xs whitespace-nowrap">{{ formatTime(a.timeIn) }}</td>
                <td>
                  <span class="text-xs font-mono" style="color: #f9a825;">{{ elapsed(a.timeIn) }}</span>
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
      </div>

      <!-- Assignment History -->
      <div class="glass-card overflow-hidden">
        <div class="px-5 py-4 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3" style="border-color: rgba(255,255,255,0.06);">
          <div>
            <h2 class="text-base font-semibold text-white">Assignment History</h2>
            <p class="text-xs text-slate-500 mt-0.5">All taxi assignment records</p>
          </div>
          <select v-model="statusFilter" class="form-input w-40 text-xs">
            <option value="">All Status</option>
            <option value="Active">Active</option>
            <option value="Completed">Completed</option>
          </select>
        </div>

        <div v-if="assignmentStore.loading" class="p-10 text-center">
          <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 text-green-500 animate-spin mx-auto" />
        </div>
        <div v-else-if="!assignmentStore.assignments.length" class="p-12 text-center">
          <UIcon name="i-heroicons-clipboard-document-list" class="w-12 h-12 text-slate-700 mx-auto mb-3" />
          <p class="text-slate-400">No assignment records found</p>
        </div>
        <div v-else>
          <div class="overflow-x-auto">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Assignment #</th>
                  <th>Driver</th>
                  <th>Taxi</th>
                  <th>Issued By</th>
                  <th>Date</th>
                  <th>Time In</th>
                  <th>Time Out</th>
                  <th>Hours</th>
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
                  <td class="text-slate-400 text-sm">{{ getIssuedBy(a) }}</td>
                  <td class="text-slate-400 text-xs whitespace-nowrap">{{ formatDate(a.assignedAt) }}</td>
                  <td class="text-slate-400 text-xs whitespace-nowrap">{{ formatTime(a.timeIn) }}</td>
                  <td class="text-slate-400 text-xs whitespace-nowrap">{{ a.timeOut ? formatTime(a.timeOut) : '—' }}</td>
                  <td class="text-xs font-mono" :style="{ color: a.totalHours ? '#f9a825' : '#64748b' }">
                    {{ formatDuration(a.totalMinutes) }}
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
                <UIcon name="i-heroicons-truck" class="w-5 h-5 text-green-400" />
              </div>
              <div>
                <h3 class="text-lg font-bold text-white">Issue Taxi</h3>
                <p class="text-xs text-slate-400">Assign an available taxi to a driver</p>
              </div>
            </div>

            <div class="space-y-4">
              <div>
                <label class="form-label">Select Driver</label>
                <select v-model="issueForm.driverId" class="form-input">
                  <option value="">— Select Available Driver —</option>
                  <option v-for="d in availableDrivers" :key="d._id" :value="d._id">
                    {{ d.fullName }} ({{ d.driverId }})
                  </option>
                </select>
                <p v-if="!availableDrivers.length" class="text-xs text-amber-400 mt-1">No available drivers at this time</p>
              </div>

              <div>
                <label class="form-label">Select Taxi Unit</label>
                <select v-model="issueForm.taxiUnitId" class="form-input">
                  <option value="">— Select Available Taxi —</option>
                  <option v-for="t in availableTaxis" :key="t._id" :value="t._id">
                    {{ t.taxiNumber }} — {{ t.plateNumber }} ({{ t.brand }} {{ t.model }})
                  </option>
                </select>
                <p v-if="!availableTaxis.length" class="text-xs text-amber-400 mt-1">No available taxis at this time</p>
              </div>

              <div>
                <label class="form-label">Remarks <span class="text-slate-600">(optional)</span></label>
                <textarea v-model="issueForm.remarks" class="form-input h-20 resize-none" placeholder="Add any notes..." />
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

            <div class="glass-card p-4 mb-5 space-y-2" style="background: rgba(255,255,255,0.03);">
              <div class="flex justify-between text-sm">
                <span class="text-slate-400">Driver</span>
                <span class="text-white font-medium">{{ getDriverName(selectedAssignment) }}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-slate-400">Taxi</span>
                <span class="text-white font-medium">{{ getTaxiNumber(selectedAssignment) }} ({{ getTaxiPlate(selectedAssignment) }})</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-slate-400">Time In</span>
                <span class="text-white">{{ formatTime(selectedAssignment.timeIn) }}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-slate-400">Elapsed</span>
                <span style="color: #f9a825;" class="font-mono font-bold">{{ elapsed(selectedAssignment.timeIn) }}</span>
              </div>
            </div>

            <div class="mb-5">
              <label class="form-label">Remarks <span class="text-slate-600">(optional)</span></label>
              <textarea v-model="returnRemarks" class="form-input h-20 resize-none" placeholder="Add any notes..." />
            </div>

            <div class="p-3 rounded-lg text-xs mb-5" style="background: rgba(249,168,37,0.08); border: 1px solid rgba(249,168,37,0.15); color: #fde68a;">
              <UIcon name="i-heroicons-clock" class="w-4 h-4 inline mr-1" />
              <strong>Time Out</strong> and <strong>Hours Worked</strong> will be calculated automatically using server time.
            </div>

            <div class="flex gap-3">
              <button class="btn-secondary flex-1" @click="showReturnModal = false">Cancel</button>
              <button
                class="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all"
                style="background: linear-gradient(135deg, #dc2626, #991b1b); color: white;"
                :disabled="returningTaxi"
                @click="handleReturn"
              >
                <UIcon v-if="returningTaxi" name="i-heroicons-arrow-path" class="w-4 h-4 animate-spin" />
                <UIcon v-else name="i-heroicons-arrow-uturn-left" class="w-4 h-4" />
                {{ returningTaxi ? 'Processing...' : 'Confirm Return' }}
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
