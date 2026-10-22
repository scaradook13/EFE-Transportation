<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import { useTaxiUnitStore } from '~/stores/taxiUnits'
import { useDriverStore } from '~/stores/drivers'
import type { TaxiUnit, Driver, User } from '~/types'

definePageMeta({ layout: 'default', middleware: 'auth' })
useHead({ title: 'Archives — EFE Taxi Dispatch System' })

const authStore = useAuthStore()
const router = useRouter()
const toast = useToast()
const taxiStore = useTaxiUnitStore()
const driverStore = useDriverStore()

// Admin-only protection
onMounted(() => {
  if (!authStore.isAdmin) {
    toast.add({ title: 'Access Denied', description: 'The Archives page is restricted to administrators.', color: 'error' })
    router.replace('/')
  } else {
    loadAllCounts()
    loadActiveTab()
  }
})

// Tab State
type TabKey = 'taxis' | 'drivers' | 'users'
const activeTab = ref<TabKey>('taxis')
const search = ref('')
const page = ref(1)
const loading = ref(false)

// Counts for tab badges
const counts = reactive({
  taxis: 0,
  drivers: 0,
  users: 0
})

// Data lists
const archivedTaxis = ref<TaxiUnit[]>([])
const archivedDrivers = ref<Driver[]>([])
const archivedUsers = ref<User[]>([])
const pagination = ref({ page: 1, limit: 10, total: 0, pages: 1 })

// Confirmation Modals
const showRestoreModal = ref(false)
const showPermanentDeleteModal = ref(false)
const modalActionLoading = ref(false)
const selectedItem = ref<{ type: TabKey; id: string; name: string; extra?: string } | null>(null)

// Formatters
const formatDate = (d?: string | Date | null) => {
  if (!d) return '—'
  const date = new Date(d)
  return isNaN(date.getTime()) ? '—' : date.toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })
}

const getArchivedByName = (item: any) => {
  if (!item?.archivedBy) return 'Administrator'
  if (typeof item.archivedBy === 'object' && item.archivedBy !== null) {
    return item.archivedBy.fullName || item.archivedBy.username || 'Administrator'
  }
  return 'Administrator'
}

// Data Fetching
const loadAllCounts = async () => {
  try {
    const [taxisRes, driversRes, usersRes] = await Promise.all([
      $fetch<any>('/api/taxi-units', { query: { archived: 'true', limit: 1 } }).catch(() => null),
      $fetch<any>('/api/drivers', { query: { archived: 'true', limit: 1 } }).catch(() => null),
      $fetch<any>('/api/users', { query: { archived: 'true', limit: 1 } }).catch(() => null)
    ])
    if (taxisRes?.pagination) counts.taxis = taxisRes.pagination.total ?? 0
    if (driversRes?.pagination) counts.drivers = driversRes.pagination.total ?? 0
    if (usersRes?.pagination) counts.users = usersRes.pagination.total ?? 0
  } catch (err) {
    console.error('Failed to load archive counts:', err)
  }
}

const loadActiveTab = async () => {
  loading.value = true
  try {
    if (activeTab.value === 'taxis') {
      const res = await $fetch<any>('/api/taxi-units', {
        query: { archived: 'true', page: page.value, limit: 10, search: search.value.trim() || undefined }
      })
      archivedTaxis.value = res.data || []
      pagination.value = res.pagination || { page: 1, limit: 10, total: 0, pages: 1 }
      counts.taxis = pagination.value.total
    } else if (activeTab.value === 'drivers') {
      const res = await $fetch<any>('/api/drivers', {
        query: { archived: 'true', page: page.value, limit: 10, search: search.value.trim() || undefined }
      })
      archivedDrivers.value = res.data || []
      pagination.value = res.pagination || { page: 1, limit: 10, total: 0, pages: 1 }
      counts.drivers = pagination.value.total
    } else if (activeTab.value === 'users') {
      const res = await $fetch<any>('/api/users', {
        query: { archived: 'true', page: page.value, limit: 10, search: search.value.trim() || undefined }
      })
      archivedUsers.value = res.data || []
      pagination.value = res.pagination || { page: 1, limit: 10, total: 0, pages: 1 }
      counts.users = pagination.value.total
    }
  } catch (err: any) {
    toast.add({
      title: 'Failed to load archives',
      description: err?.data?.message || err?.message || 'Could not retrieve archived records.',
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}

const switchTab = (tab: TabKey) => {
  activeTab.value = tab
  page.value = 1
  search.value = ''
  loadActiveTab()
}

// Watchers
let debounceTimer: ReturnType<typeof setTimeout> | null = null
watch(search, () => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    page.value = 1
    loadActiveTab()
  }, 300)
})

watch(page, () => {
  loadActiveTab()
})

// Modal Actions
const openRestoreModal = (type: TabKey, item: any) => {
  let name = ''
  let extra = ''
  if (type === 'taxis') {
    name = `Taxi #${item.taxiNumber}`
    extra = `Plate: ${item.plateNumber}`
  } else if (type === 'drivers') {
    name = item.fullName
    extra = `Driver ID: ${item.driverId}`
  } else if (type === 'users') {
    name = item.fullName
    extra = `Username: ${item.username}`
  }
  selectedItem.value = { type, id: item._id, name, extra }
  showRestoreModal.value = true
}

const handleConfirmRestore = async () => {
  if (!selectedItem.value) return
  modalActionLoading.value = true
  const { type, id, name } = selectedItem.value
  try {
    if (type === 'taxis') {
      await taxiStore.restore(id)
    } else if (type === 'drivers') {
      await driverStore.restore(id)
    } else if (type === 'users') {
      await $fetch(`/api/users/${id}/restore`, { method: 'POST' })
    }
    toast.add({
      title: 'Restored Successfully',
      description: `${name} has been returned to the active system list.`,
      color: 'success'
    })
    showRestoreModal.value = false
    await loadAllCounts()
    await loadActiveTab()
  } catch (err: any) {
    toast.add({
      title: 'Restore Failed',
      description: err?.data?.message || err?.message || 'Could not restore record.',
      color: 'error'
    })
  } finally {
    modalActionLoading.value = false
  }
}

const openPermanentDeleteModal = (type: TabKey, item: any) => {
  let name = ''
  let extra = ''
  if (type === 'taxis') {
    name = `Taxi #${item.taxiNumber}`
    extra = `Plate: ${item.plateNumber}`
  } else if (type === 'drivers') {
    name = item.fullName
    extra = `Driver ID: ${item.driverId}`
  } else if (type === 'users') {
    name = item.fullName
    extra = `Username: ${item.username}`
  }
  selectedItem.value = { type, id: item._id, name, extra }
  showPermanentDeleteModal.value = true
}

const handleConfirmPermanentDelete = async () => {
  if (!selectedItem.value) return
  modalActionLoading.value = true
  const { type, id, name } = selectedItem.value
  try {
    if (type === 'taxis') {
      await taxiStore.permanentDelete(id)
    } else if (type === 'drivers') {
      await driverStore.permanentDelete(id)
    } else if (type === 'users') {
      await $fetch(`/api/users/${id}`, { method: 'DELETE' })
    }
    toast.add({
      title: 'Permanently Deleted',
      description: `${name} has been permanently removed from the database.`,
      color: 'success'
    })
    showPermanentDeleteModal.value = false
    await loadAllCounts()
    await loadActiveTab()
  } catch (err: any) {
    toast.add({
      title: 'Permanent Delete Failed',
      description: err?.data?.message || err?.message || 'Could not permanently delete record.',
      color: 'error'
    })
  } finally {
    modalActionLoading.value = false
  }
}
</script>

<template>
  <div class="p-6 space-y-6 animate-fadeIn max-w-[1600px] mx-auto">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <UIcon name="i-heroicons-archive-box" class="w-6 h-6" />
          </div>
          <div>
            <h1 class="text-2xl font-bold text-white">Archives</h1>
            <p class="text-xs sm:text-sm text-slate-400">Admin Repository for archived taxi units, drivers, and user accounts</p>
          </div>
        </div>
      </div>
      <div class="text-xs text-slate-400 bg-white/[0.03] border border-white/10 px-3.5 py-2 rounded-xl flex items-center gap-2 self-start sm:self-auto">
        <UIcon name="i-heroicons-shield-check" class="w-4 h-4 text-emerald-400" />
        <span>Admin Only Management Area</span>
      </div>
    </div>

    <!-- Navigation Sub-Tabs -->
    <div class="flex items-center gap-2 border-b border-white/10 pb-3 overflow-x-auto">
      <button
        class="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all cursor-pointer shrink-0"
        :class="[
          activeTab === 'taxis'
            ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-lg shadow-amber-950/30'
            : 'text-slate-400 hover:text-white hover:bg-white/5'
        ]"
        @click="switchTab('taxis')"
      >
        <UIcon name="i-lucide-car-taxi-front" class="w-4 h-4" />
        <span>Archived Taxis</span>
        <span
          class="px-2 py-0.5 rounded-full text-xs font-bold"
          :class="activeTab === 'taxis' ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-400'"
        >
          {{ counts.taxis }}
        </span>
      </button>

      <button
        class="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all cursor-pointer shrink-0"
        :class="[
          activeTab === 'drivers'
            ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-lg shadow-amber-950/30'
            : 'text-slate-400 hover:text-white hover:bg-white/5'
        ]"
        @click="switchTab('drivers')"
      >
        <UIcon name="i-heroicons-user-group" class="w-4 h-4" />
        <span>Archived Drivers</span>
        <span
          class="px-2 py-0.5 rounded-full text-xs font-bold"
          :class="activeTab === 'drivers' ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-400'"
        >
          {{ counts.drivers }}
        </span>
      </button>

      <button
        class="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all cursor-pointer shrink-0"
        :class="[
          activeTab === 'users'
            ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-lg shadow-amber-950/30'
            : 'text-slate-400 hover:text-white hover:bg-white/5'
        ]"
        @click="switchTab('users')"
      >
        <UIcon name="i-heroicons-users" class="w-4 h-4" />
        <span>Archived Users</span>
        <span
          class="px-2 py-0.5 rounded-full text-xs font-bold"
          :class="activeTab === 'users' ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-400'"
        >
          {{ counts.users }}
        </span>
      </button>
    </div>

    <!-- Search Bar & Table Controls -->
    <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
      <div class="relative flex-1 max-w-md">
        <UIcon name="i-heroicons-magnifying-glass" class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none z-10" />
        <input
          v-model="search"
          type="text"
          class="form-input !pl-10 !pr-10 w-full"
          style="padding-left: 2.5rem !important; padding-right: 2.5rem !important;"
          :placeholder="
            activeTab === 'taxis' ? 'Search by taxi #, plate, brand...' :
            activeTab === 'drivers' ? 'Search by name, driver ID, license...' :
            'Search by username, full name...'
          "
        />
        <button
          v-if="search"
          class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 z-10"
          @click="search = ''"
        >
          <UIcon name="i-heroicons-x-mark" class="w-4 h-4" />
        </button>
      </div>

      <button
        class="btn-secondary flex items-center justify-center gap-2 text-xs py-2.5 px-3 self-end sm:self-auto"
        :disabled="loading"
        @click="loadActiveTab"
      >
        <UIcon name="i-heroicons-arrow-path" class="w-4 h-4" :class="{ 'animate-spin': loading }" />
        <span>Refresh</span>
      </button>
    </div>

    <!-- Main Content Container -->
    <div class="glass-card overflow-hidden" style="background: rgba(17,24,39,0.7); border: 1px solid rgba(255,255,255,0.08);">
      <!-- Loading State -->
      <div v-if="loading" class="py-16 text-center text-slate-400 flex flex-col items-center gap-3">
        <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-amber-400" />
        <p class="text-sm font-medium">Loading archived records...</p>
      </div>

      <!-- TAB 1: ARCHIVED TAXIS -->
      <div v-else-if="activeTab === 'taxis'">
        <div v-if="archivedTaxis.length === 0" class="py-16 text-center text-slate-400">
          <UIcon name="i-lucide-car-taxi-front" class="w-12 h-12 mx-auto mb-3 text-slate-600" />
          <p class="text-base font-semibold text-white">No Archived Taxis</p>
          <p class="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {{ search ? 'No archived taxi units match your search query.' : 'There are currently no archived taxi units in the system.' }}
          </p>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="data-table w-full">
            <thead>
              <tr>
                <th class="text-center">Taxi #</th>
                <th class="text-center">Plate #</th>
                <th class="text-center">Vehicle Model</th>
                <th class="text-center">Type</th>
                <th class="text-center">Archived Date</th>
                <th class="text-center">Archived By</th>
                <th class="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="unit in archivedTaxis" :key="unit._id" class="hover:bg-white/[0.02] transition-colors">
                <td class="text-center">
                  <span class="font-bold text-white text-base font-mono">#{{ unit.taxiNumber }}</span>
                </td>
                <td class="text-center">
                  <span class="font-mono text-xs uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    {{ unit.plateNumber }}
                  </span>
                </td>
                <td class="text-center">
                  <p class="text-white font-medium text-sm">{{ unit.brand }} {{ unit.model }}</p>
                  <p class="text-xs text-slate-400">{{ unit.year }} • {{ unit.color }}</p>
                </td>
                <td class="text-center">
                  <span
                    class="px-2 py-0.5 rounded-full text-xs font-semibold uppercase"
                    :class="unit.taxiType === 'SUPERMAN' ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30' : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'"
                  >
                    {{ unit.taxiType }}
                  </span>
                </td>
                <td class="text-center text-xs text-slate-300">
                  {{ formatDate(unit.archivedAt) }}
                </td>
                <td class="text-center text-xs text-slate-400">
                  {{ getArchivedByName(unit) }}
                </td>
                <td class="text-center">
                  <div class="flex items-center justify-center gap-2">
                    <!-- Restore Button -->
                    <button
                      class="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Restore Taxi to Active Fleet"
                      @click="openRestoreModal('taxis', unit)"
                    >
                      <UIcon name="i-heroicons-arrow-uturn-left" class="w-3.5 h-3.5" />
                      <span>Restore</span>
                    </button>
                    <!-- Permanent Delete Button -->
                    <button
                      class="px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Permanently Delete Taxi Unit"
                      @click="openPermanentDeleteModal('taxis', unit)"
                    >
                      <UIcon name="i-heroicons-trash" class="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- TAB 2: ARCHIVED DRIVERS -->
      <div v-else-if="activeTab === 'drivers'">
        <div v-if="archivedDrivers.length === 0" class="py-16 text-center text-slate-400">
          <UIcon name="i-heroicons-user-group" class="w-12 h-12 mx-auto mb-3 text-slate-600" />
          <p class="text-base font-semibold text-white">No Archived Drivers</p>
          <p class="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {{ search ? 'No archived drivers match your search query.' : 'There are currently no archived driver profiles in the system.' }}
          </p>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="data-table w-full">
            <thead>
              <tr>
                <th>Driver Profile</th>
                <th class="text-center">Driver ID</th>
                <th class="text-center">Contact</th>
                <th class="text-center">License #</th>
                <th class="text-center">Archived Date</th>
                <th class="text-center">Archived By</th>
                <th class="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="driver in archivedDrivers" :key="driver._id" class="hover:bg-white/[0.02] transition-colors">
                <td>
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 overflow-hidden">
                      <img v-if="driver.photo" :src="driver.photo" :alt="driver.fullName" class="w-full h-full object-cover" />
                      <span v-else class="text-sm font-bold text-slate-400">{{ driver.fullName.charAt(0) }}</span>
                    </div>
                    <div>
                      <p class="text-white font-medium text-sm">{{ driver.fullName }}</p>
                      <p class="text-xs text-slate-400 line-clamp-1">{{ driver.address || '—' }}</p>
                    </div>
                  </div>
                </td>
                <td class="text-center">
                  <span class="font-mono text-xs text-slate-300 font-semibold">{{ driver.driverId }}</span>
                </td>
                <td class="text-center text-xs text-slate-300">
                  {{ driver.contactNumber || '—' }}
                </td>
                <td class="text-center">
                  <span class="font-mono text-xs uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    {{ driver.licenseNumber }}
                  </span>
                </td>
                <td class="text-center text-xs text-slate-300">
                  {{ formatDate(driver.archivedAt) }}
                </td>
                <td class="text-center text-xs text-slate-400">
                  {{ getArchivedByName(driver) }}
                </td>
                <td class="text-center">
                  <div class="flex items-center justify-center gap-2">
                    <!-- Restore Button -->
                    <button
                      class="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Restore Driver to Active List"
                      @click="openRestoreModal('drivers', driver)"
                    >
                      <UIcon name="i-heroicons-arrow-uturn-left" class="w-3.5 h-3.5" />
                      <span>Restore</span>
                    </button>
                    <!-- Permanent Delete Button -->
                    <button
                      class="px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Permanently Delete Driver Profile"
                      @click="openPermanentDeleteModal('drivers', driver)"
                    >
                      <UIcon name="i-heroicons-trash" class="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- TAB 3: ARCHIVED USERS -->
      <div v-else-if="activeTab === 'users'">
        <div v-if="archivedUsers.length === 0" class="py-16 text-center text-slate-400">
          <UIcon name="i-heroicons-users" class="w-12 h-12 mx-auto mb-3 text-slate-600" />
          <p class="text-base font-semibold text-white">No Archived Users</p>
          <p class="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {{ search ? 'No archived user accounts match your search query.' : 'There are currently no archived user accounts in the system.' }}
          </p>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="data-table w-full">
            <thead>
              <tr>
                <th>User Account</th>
                <th class="text-center">Username</th>
                <th class="text-center">System Role</th>
                <th class="text-center">Biometrics</th>
                <th class="text-center">Archived Date</th>
                <th class="text-center">Archived By</th>
                <th class="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in archivedUsers" :key="user._id" class="hover:bg-white/[0.02] transition-colors">
                <td>
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-300 shrink-0">
                      {{ user.fullName.charAt(0) }}
                    </div>
                    <div>
                      <p class="text-white font-medium text-sm">{{ user.fullName }}</p>
                      <p class="text-xs text-slate-500">{{ user.email || 'No email registered' }}</p>
                    </div>
                  </div>
                </td>
                <td class="text-center">
                  <span class="font-mono text-xs text-slate-300 font-semibold">{{ user.username }}</span>
                </td>
                <td class="text-center">
                  <span
                    class="px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase border"
                    :class="
                      user.role === 'admin' ? 'bg-red-500/15 text-red-400 border-red-500/30' :
                      user.role === 'hr' ? 'bg-blue-500/15 text-blue-400 border-blue-500/30' :
                      'bg-green-500/15 text-green-400 border-green-500/30'
                    "
                  >
                    {{ user.role }}
                  </span>
                </td>
                <td class="text-center">
                  <span
                    class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium"
                    :class="user.biometric?.enrolled ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-500'"
                  >
                    <UIcon :name="user.biometric?.enrolled ? 'i-heroicons-check-circle' : 'i-heroicons-minus-circle'" class="w-3.5 h-3.5" />
                    <span>{{ user.biometric?.enrolled ? 'Enrolled' : 'None' }}</span>
                  </span>
                </td>
                <td class="text-center text-xs text-slate-300">
                  {{ formatDate(user.archivedAt) }}
                </td>
                <td class="text-center text-xs text-slate-400">
                  {{ getArchivedByName(user) }}
                </td>
                <td class="text-center">
                  <div class="flex items-center justify-center gap-2">
                    <!-- Restore Button -->
                    <button
                      class="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Restore User Account"
                      @click="openRestoreModal('users', user)"
                    >
                      <UIcon name="i-heroicons-arrow-uturn-left" class="w-3.5 h-3.5" />
                      <span>Restore</span>
                    </button>
                    <!-- Permanent Delete Button -->
                    <button
                      class="px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Permanently Delete User Account"
                      @click="openPermanentDeleteModal('users', user)"
                    >
                      <UIcon name="i-heroicons-trash" class="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Pagination Footer -->
      <div v-if="pagination.pages > 1" class="flex items-center justify-between px-5 py-4 border-t border-white/10">
        <p class="text-xs text-slate-400">
          Showing page <span class="font-bold text-white">{{ pagination.page }}</span> of <span class="font-bold text-white">{{ pagination.pages }}</span> ({{ pagination.total }} archived items)
        </p>
        <div class="flex items-center gap-2">
          <button
            class="btn-secondary text-xs py-1.5 px-3 disabled:opacity-30 disabled:cursor-not-allowed"
            :disabled="pagination.page <= 1"
            @click="page = pagination.page - 1"
          >
            Previous
          </button>
          <button
            class="btn-secondary text-xs py-1.5 px-3 disabled:opacity-30 disabled:cursor-not-allowed"
            :disabled="pagination.page >= pagination.pages"
            @click="page = pagination.page + 1"
          >
            Next
          </button>
        </div>
      </div>
    </div>

    <!-- RESTORE CONFIRMATION MODAL -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showRestoreModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="showRestoreModal = false" />
          <div class="relative glass-card p-6 max-w-sm w-full animate-fadeIn text-center">
            <div class="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4 text-emerald-400">
              <UIcon name="i-heroicons-arrow-uturn-left" class="w-6 h-6" />
            </div>
            <h3 class="text-lg font-bold text-white mb-2">Restore Profile?</h3>
            <p class="text-slate-300 text-sm mb-1 font-semibold">
              {{ selectedItem?.name }}
            </p>
            <p v-if="selectedItem?.extra" class="text-xs font-mono text-slate-400 mb-4">
              {{ selectedItem.extra }}
            </p>
            <p class="text-slate-400 text-xs mb-6">
              This will unarchive the profile and return it directly to the active system lists.
            </p>
            <div class="flex gap-3">
              <button class="btn-secondary flex-1" :disabled="modalActionLoading" @click="showRestoreModal = false">Cancel</button>
              <button
                class="btn-primary flex-1 !bg-emerald-600 hover:!bg-emerald-500 text-white flex items-center justify-center gap-2"
                :disabled="modalActionLoading"
                @click="handleConfirmRestore"
              >
                <UIcon v-if="modalActionLoading" name="i-heroicons-arrow-path" class="w-4 h-4 animate-spin" />
                <span>{{ modalActionLoading ? 'Restoring...' : 'Restore' }}</span>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- PERMANENT DELETE CONFIRMATION MODAL -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showPermanentDeleteModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="showPermanentDeleteModal = false" />
          <div class="relative glass-card p-6 max-w-sm w-full animate-fadeIn text-center border-rose-500/30">
            <div class="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto mb-4 text-rose-400">
              <UIcon name="i-heroicons-trash" class="w-6 h-6" />
            </div>
            <h3 class="text-lg font-bold text-white mb-2">Permanently Delete?</h3>
            <p class="text-rose-300 text-sm mb-1 font-semibold">
              {{ selectedItem?.name }}
            </p>
            <p v-if="selectedItem?.extra" class="text-xs font-mono text-slate-400 mb-4">
              {{ selectedItem.extra }}
            </p>
            <div class="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl mb-6 text-left">
              <p class="text-rose-300 text-xs font-semibold flex items-center gap-1.5 mb-1">
                <UIcon name="i-heroicons-exclamation-triangle" class="w-4 h-4 shrink-0" />
                Warning: Irreversible Action
              </p>
              <p class="text-rose-200/80 text-[11px] leading-relaxed">
                This record will be permanently purged from the database. Any past dispatch or boundary history will be retained, but the profile reference cannot be recovered.
              </p>
            </div>
            <div class="flex gap-3">
              <button class="btn-secondary flex-1" :disabled="modalActionLoading" @click="showPermanentDeleteModal = false">Cancel</button>
              <button
                class="btn-primary flex-1 !bg-red-600 hover:!bg-red-500 text-white flex items-center justify-center gap-2"
                :disabled="modalActionLoading"
                @click="handleConfirmPermanentDelete"
              >
                <UIcon v-if="modalActionLoading" name="i-heroicons-arrow-path" class="w-4 h-4 animate-spin" />
                <span>{{ modalActionLoading ? 'Deleting...' : 'Permanently Delete' }}</span>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
