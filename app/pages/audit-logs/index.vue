<script setup lang="ts">
definePageMeta({ layout: 'default', middleware: 'auth' })
useHead({ title: 'Audit Logs — EFE Taxi Dispatch System' })

const authStore = useAuthStore()
const router = useRouter()

// Redirect if not admin
if (!authStore.isAdmin) {
  router.push('/')
}

interface UserOption {
  _id: string
  fullName: string
  username: string
  role?: string
}

const logs = ref([])
const loading = ref(false)
const page = ref(1)
const pagination = ref<{ total: number; page: number; limit: number; pages: number } | null>(null)
const moduleFilter = ref('')
const userFilter = ref('')
const usersList = ref<UserOption[]>([])
const loadingUsers = ref(false)
const dateFrom = ref('')
const dateTo = ref('')
const search = ref('')

const moduleOptions = [
  { value: 'Auth', label: 'Login & Security' },
  { value: 'Drivers', label: 'Drivers' },
  { value: 'Taxi Units', label: 'Taxi Units' },
  { value: 'Taxi Assignment', label: 'Taxi Assignment' },
  { value: 'User', label: 'User' }
]

const formatModuleName = (mod: string) => {
  if (mod === 'Auth') return 'Login & Security'
  return mod
}

const loadUsersList = async () => {
  if (usersList.value.length > 0) return
  loadingUsers.value = true
  try {
    const res = await $fetch<{ data: UserOption[] }>('/api/users', { query: { limit: 100 } })
    usersList.value = res.data || []
  } catch (err) {
    console.error('Failed to load users list:', err)
  } finally {
    loadingUsers.value = false
  }
}

const loadLogs = async () => {
  loading.value = true
  try {
    const params: Record<string, string | number> = { page: page.value, limit: 20 }
    if (moduleFilter.value === 'User') {
      if (userFilter.value) params.user = userFilter.value
    } else if (moduleFilter.value) {
      params.module = moduleFilter.value
    }
    if (dateFrom.value) params.dateFrom = dateFrom.value
    if (dateTo.value) params.dateTo = dateTo.value
    if (search.value) params.search = search.value

    const response = await $fetch<{
      data: typeof logs.value
      pagination: typeof pagination.value
    }>('/api/audit-logs', { query: params })

    logs.value = response.data
    pagination.value = response.pagination
  } catch {
    // silent
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadLogs()
  loadUsersList()
})

watch(moduleFilter, (newVal) => {
  page.value = 1
  if (newVal === 'User') {
    loadUsersList()
  } else {
    userFilter.value = ''
  }
  loadLogs()
})

watch([userFilter, dateFrom, dateTo], () => { page.value = 1; loadLogs() })
watch(search, useDebounceFn(() => { page.value = 1; loadLogs() }, 300))
watch(page, loadLogs)

const formatDateTime = (d: string) => new Date(d).toLocaleString('en-PH', {
  month: 'short', day: 'numeric', year: 'numeric',
  hour: '2-digit', minute: '2-digit', hour12: true
})

const getUserName = (log: { user: { fullName?: string } | string }) => {
  return (typeof log.user === 'object' && log.user !== null) ? log.user.fullName : 'Unknown'
}

const actionColor = (action: string) => {
  if (action.includes('DELETE')) return 'text-red-400'
  if (action.includes('CREATE')) return 'text-green-400'
  if (action.includes('UPDATE')) return 'text-blue-400'
  if (action === 'LOGIN') return 'text-yellow-400'
  return 'text-slate-400'
}
</script>

<template>
    <div class="p-6 space-y-5 animate-fadeIn">
      <div>
        <h1 class="text-2xl font-bold text-white">Audit Logs</h1>
        <p class="text-sm text-slate-400 mt-0.5">Track all user actions across the system</p>
      </div>

      <!-- Filters -->
      <div class="glass-card p-4 flex flex-wrap gap-3">
        <div class="relative flex-1 min-w-[200px]">
          <UIcon name="i-heroicons-magnifying-glass" class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none" style="color: #94a3b8; z-index: 1;" />
          <input v-model="search" type="text" class="form-input search-input" placeholder="Search by user, action, module, IP address, browser..." />
        </div>
        <select v-model="moduleFilter" class="form-input filter-dropdown w-56">
          <option value="">All Modules</option>
          <option v-for="m in moduleOptions" :key="m.value" :value="m.value">{{ m.label }}</option>
        </select>

        <select
          v-if="moduleFilter === 'User'"
          v-model="userFilter"
          class="form-input filter-dropdown w-64 animate-fadeIn"
        >
          <option value="">All Users</option>
          <option v-for="u in usersList" :key="u._id" :value="u._id">
            {{ u.fullName }} ({{ u.username }})
          </option>
        </select>

        <div class="flex items-center gap-2">
          <input v-model="dateFrom" type="date" class="form-input filter-dropdown w-40 !px-3" placeholder="From date" />
          <span class="text-slate-500 text-sm">to</span>
          <input v-model="dateTo" type="date" class="form-input filter-dropdown w-40 !px-3" placeholder="To date" />
        </div>
        <button class="btn-secondary px-3 py-2 text-xs" @click="() => { search = ''; moduleFilter = ''; userFilter = ''; dateFrom = ''; dateTo = ''; loadLogs() }">
          <UIcon name="i-heroicons-x-mark" class="w-3.5 h-3.5" /> Clear
        </button>
      </div>

      <!-- Table -->
      <div class="glass-card overflow-hidden">
        <div v-if="loading" class="p-10 text-center">
          <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 text-green-500 animate-spin mx-auto" />
        </div>
        <div v-else-if="!logs.length" class="p-16 text-center">
          <UIcon name="i-heroicons-clipboard-document-list" class="w-12 h-12 text-slate-700 mx-auto mb-3" />
          <p class="text-slate-400 font-medium">No audit logs found.</p>
          <p v-if="search" class="text-slate-500 text-xs mt-1">Try searching using a different keyword.</p>
        </div>
        <div v-else>
          <div class="overflow-x-auto">
            <table class="data-table">
              <thead>
                <tr>
                  <th class="text-left">Timestamp</th>
                  <th class="text-left">User</th>
                  <th class="text-center">Action</th>
                  <th class="text-center">Module</th>
                  <th class="text-left">Details</th>
                  <th class="text-center">IP Address</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="log in (logs as Array<{ _id: string; createdAt: string; user: { fullName?: string } | string; action: string; module: string; details: string; ipAddress: string }>)" :key="log._id" class="transition-colors hover:bg-white/[0.02]">
                  <td class="text-left text-xs text-slate-400 whitespace-nowrap">{{ formatDateTime(log.createdAt) }}</td>
                  <td class="text-left text-white font-medium text-sm">{{ getUserName(log) }}</td>
                  <td class="text-center">
                    <span :class="['font-mono text-xs font-bold', actionColor(log.action)]">{{ log.action }}</span>
                  </td>
                  <td class="text-center">
                    <span class="px-2.5 py-0.5 rounded text-xs font-medium inline-block" style="background: rgba(255,255,255,0.05); color: #94a3b8;">
                      {{ formatModuleName(log.module) }}
                    </span>
                  </td>
                  <td class="text-left">
                    <NotesViewer :content="log.details" title="Audit Log Notes" />
                  </td>
                  <td class="text-center font-mono text-xs text-slate-400">{{ log.ipAddress }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination -->
          <div v-if="pagination && pagination.pages > 1" class="flex items-center justify-between px-5 py-4 border-t" style="border-color: rgba(255,255,255,0.06);">
            <p class="text-xs text-slate-500">{{ pagination.total }} total entries</p>
            <div class="flex gap-2">
              <button :disabled="page <= 1" class="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40" @click="page--">
                <UIcon name="i-heroicons-chevron-left" class="w-4 h-4" />
              </button>
              <button :disabled="page >= pagination.pages" class="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40" @click="page++">
                <UIcon name="i-heroicons-chevron-right" class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
</template>
