<script setup lang="ts">
import { formatTaxiType, formatBoundaryCurrency } from '~~/shared/utils/boundary'
import type { ReportPeriod, BoundaryReportData } from '~/types'


definePageMeta({ layout: 'default', middleware: 'auth' })

const authStore = useAuthStore()
const router = useRouter()

// Restrict access: only Admin and Dispatcher are authorized
if (!authStore.isAdmin && !authStore.isDispatcher) {
  router.push('/taxi-units')
}

const route = useRoute()
const taxiId = computed(() => route.params.id as string)


const period = ref<ReportPeriod>('daily')
const selectedDate = ref('')
const report = ref<BoundaryReportData | null>(null)
const loading = ref(true)
const error = ref('')

useHead({
  title: computed(() => {
    const num = report.value?.taxi.taxiNumber || 'Taxi'
    return `${num} Boundary Report — EFE Taxi Dispatch System`
  })
})

const fetchReport = async () => {
  loading.value = true
  error.value = ''
  try {
    const query: Record<string, string> = { period: period.value }
    if (selectedDate.value) {
      query.date = selectedDate.value
    }
    const res = await $fetch<{ success: boolean; data: BoundaryReportData }>(
      `/api/taxi-units/${taxiId.value}/boundary-report`,
      { query }
    )
    report.value = res.data
  } catch (err: any) {
    error.value = err?.data?.message || err?.message || 'Failed to load boundary report'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchReport()
})

const changePeriod = (newPeriod: ReportPeriod) => {
  if (period.value === newPeriod) return
  period.value = newPeriod
  selectedDate.value = ''
  fetchReport()
}

const navigatePrev = () => {
  if (!report.value) return
  selectedDate.value = report.value.dateRange.prevDate || ''
  fetchReport()
}

const navigateNext = () => {
  if (!report.value) return
  selectedDate.value = report.value.dateRange.nextDate || ''
  fetchReport()
}

const resetToCurrent = () => {
  selectedDate.value = ''
  fetchReport()
}

const maxBreakdownBoundary = computed(() => {
  if (!report.value || !report.value.breakdown.length) return 1
  const max = Math.max(...report.value.breakdown.map(b => b.boundary), 0)
  return max > 0 ? max : 1
})

const statusClass = (status: string) => {
  if (status === 'Available') return 'badge-available'
  if (status === 'In Use') return 'badge-completed'
  return 'badge-maintenance'
}

const getTaxiColorHex = (colorName: string) => {
  const normalized = (colorName || '').toLowerCase().trim()
  switch (normalized) {
    case 'green': return '#22c55e'
    case 'blue': return '#3b82f6'
    case 'red': return '#ef4444'
    case 'white': return '#ffffff'
    case 'black': return '#000000'
    case 'yellow': return '#eab308'
    case 'silver':
    case 'gray': return '#9ca3af'
    case 'orange': return '#f97316'
    case 'purple': return '#a855f7'
    default: return '#f9a825'
  }
}

const formatDateTime = (d: string) => {
  const date = new Date(d)
  return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' • ' +
    date.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: true })
}

const formatTimeOnly = (d: string) => {
  return new Date(d).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: true })
}

const formatDateOnly = (d: string) => {
  return new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
}
</script>

<template>
  <div class="p-6 space-y-6 animate-fadeIn">
    <!-- Top Navigation & Breadcrumb -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div class="flex items-center gap-3">
        <NuxtLink
          to="/taxi-units"
          class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 flex items-center gap-1.5 transition-all"
        >
          <UIcon name="i-heroicons-arrow-left" class="w-4 h-4" />
          Back to Taxi Fleet
        </NuxtLink>
        <span class="text-slate-600">/</span>
        <span class="text-sm font-medium text-slate-400">Boundary Report</span>
      </div>

      <!-- Quick Action Buttons -->
      <div class="flex items-center gap-2">
        <button
          class="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5"
          :disabled="loading"
          @click="fetchReport"
        >
          <UIcon name="i-heroicons-arrow-path" class="w-3.5 h-3.5" :class="{ 'animate-spin': loading }" />
          Refresh
        </button>
      </div>
    </div>

    <!-- Error Banner -->
    <div v-if="error" class="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400">
      <UIcon name="i-heroicons-exclamation-circle" class="w-5 h-5 shrink-0" />
      <div>
        <p class="font-semibold text-sm">{{ error }}</p>
        <p class="text-xs text-red-400/80 mt-0.5">Please check if this taxi exists or return to the Taxi Fleet page.</p>
      </div>
    </div>

    <!-- Taxi Information Header Card -->
    <div v-if="report" class="glass-card p-5">
      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <!-- Left info -->
        <div class="flex items-start sm:items-center gap-4">
          <div class="w-14 h-14 rounded-2xl bg-yellow-900/20 border border-yellow-500/20 flex items-center justify-center shrink-0">
            <UIcon name="i-lucide-car-taxi-front" class="w-7 h-7 text-yellow-400" />
          </div>
          <div>
            <div class="flex flex-wrap items-center gap-2.5">
              <h1 class="text-2xl font-bold text-white">{{ report.taxi.taxiNumber }}</h1>
              <span
                :class="[
                  'px-2.5 py-0.5 rounded-full text-xs font-semibold border',
                  report.taxi.taxiType === 'SUPERMAN'
                    ? 'bg-blue-500/15 text-blue-400 border-blue-500/25'
                    : 'bg-amber-500/15 text-amber-400 border-amber-500/25'
                ]"
              >
                {{ report.taxi.formattedTaxiType }} (₱{{ report.taxi.taxiType === 'SUPERMAN' ? '990' : '920' }} base)
              </span>
              <span :class="['px-2.5 py-0.5 rounded-full text-xs font-medium', statusClass(report.taxi.status)]">
                Status: {{ report.taxi.status }}
              </span>
            </div>
            <p class="text-slate-400 text-sm mt-1 flex flex-wrap items-center gap-2">
              <span class="font-mono text-slate-200 uppercase font-semibold">{{ report.taxi.plateNumber }}</span>
              <span>•</span>
              <span>{{ report.taxi.brand }} {{ report.taxi.model }} ({{ report.taxi.year }})</span>
              <span>•</span>
              <span class="inline-flex items-center gap-1.5">
                <span
                  class="w-2.5 h-2.5 rounded-full border inline-block"
                  :style="{
                    background: getTaxiColorHex(report.taxi.color),
                    borderColor: getTaxiColorHex(report.taxi.color) === '#ffffff' ? '#cbd5e1' : 'rgba(255,255,255,0.2)'
                  }"
                />
                {{ report.taxi.color }}
              </span>
            </p>
          </div>
        </div>

        <!-- Active Deployment Card (if In Use) -->
        <div
          v-if="report.activeDeployment"
          class="p-3.5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          style="background: rgba(34,197,94,0.08); border-color: rgba(34,197,94,0.25);"
        >
          <div class="flex items-center gap-3">
            <span class="w-3 h-3 rounded-full bg-green-400 animate-pulse shrink-0" />
            <div>
              <div class="text-xs font-bold text-green-400 uppercase tracking-wider">Currently Deployed</div>
              <div class="text-sm font-semibold text-white mt-0.5">
                {{ report.activeDeployment.driver.fullName }}
                <span class="text-xs text-slate-400 font-normal">({{ report.activeDeployment.driver.driverId }})</span>
              </div>
              <div class="text-xs text-slate-400 mt-0.5">
                Time In: {{ formatTimeOnly(report.activeDeployment.timeIn) }} • Duty: {{ report.activeDeployment.formattedElapsed }}
              </div>
            </div>
          </div>
          <div class="sm:text-right shrink-0">
            <div class="text-[11px] text-slate-400 uppercase tracking-wider">Running Boundary</div>
            <div class="text-xl font-bold font-mono text-amber-400">
              ₱{{ report.activeDeployment.currentBoundary.toLocaleString('en-PH') }}
            </div>
            <div v-if="report.activeDeployment.overtimeHours > 0" class="text-[10px] text-purple-300">
              +{{ report.activeDeployment.overtimeHours }}h overtime
            </div>
            <div v-else-if="report.activeDeployment.elapsedHours < 16" class="text-[10px] text-slate-500">
              &lt; 16 hrs (₱0)
            </div>
            <div v-else class="text-[10px] text-slate-400">
              Base boundary
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Time Period Selector & Date Navigation Bar -->
    <div class="glass-card p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
      <!-- Period Tabs -->
      <div class="inline-flex p-1 rounded-xl bg-slate-950/40 border border-white/5 self-start md:self-auto">
        <button
          v-for="p in (['daily', 'weekly', 'monthly', 'yearly'] as const)"
          :key="p"
          :class="[
            'px-4 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all',
            period === p
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
          ]"
          @click="changePeriod(p)"
        >
          {{ p }}
        </button>
      </div>

      <!-- Date Navigator -->
      <div v-if="report" class="flex items-center justify-between md:justify-end gap-2 sm:gap-3">
        <button
          class="btn-secondary px-2.5 py-1.5 text-xs flex items-center gap-1"
          title="Previous Period"
          @click="navigatePrev"
        >
          <UIcon name="i-heroicons-chevron-left" class="w-4 h-4" />
          <span class="hidden sm:inline">Previous</span>
        </button>

        <div class="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-center min-w-[170px] sm:min-w-[220px]">
          <span class="text-xs sm:text-sm font-semibold text-white">
            {{ report.dateRange.displayLabel }}
          </span>
        </div>

        <button
          class="btn-secondary px-2.5 py-1.5 text-xs flex items-center gap-1"
          title="Next Period"
          @click="navigateNext"
        >
          <span class="hidden sm:inline">Next</span>
          <UIcon name="i-heroicons-chevron-right" class="w-4 h-4" />
        </button>

        <button
          class="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors"
          title="Jump to Current Period"
          @click="resetToCurrent"
        >
          Current
        </button>
      </div>
    </div>

    <!-- Summary KPI Cards -->
    <div v-if="report" class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="stat-card">
        <div class="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style="background: rgba(249,168,37,0.12);">
          <UIcon name="i-heroicons-banknotes" class="w-5 h-5 text-amber-400" />
        </div>
        <div class="text-2xl sm:text-3xl font-bold font-mono text-amber-400">
          {{ report.summary.formattedTotalBoundary }}
        </div>
        <div class="text-xs text-slate-400 mt-1 font-medium">Total Boundary</div>
        <div class="text-[11px] text-slate-500 mt-0.5 capitalize">{{ period }} earnings</div>
      </div>

      <div class="stat-card">
        <div class="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style="background: rgba(34,197,94,0.12);">
          <UIcon name="i-heroicons-key" class="w-5 h-5 text-green-400" />
        </div>
        <div class="text-2xl sm:text-3xl font-bold text-white">
          {{ report.summary.totalDispatches }}
        </div>
        <div class="text-xs text-slate-400 mt-1 font-medium">Total Dispatches</div>
        <div class="text-[11px] text-slate-500 mt-0.5">Trips in period</div>
      </div>

      <div class="stat-card">
        <div class="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style="background: rgba(96,165,250,0.12);">
          <UIcon name="i-heroicons-clock" class="w-5 h-5 text-blue-400" />
        </div>
        <div class="text-2xl sm:text-3xl font-bold font-mono text-white">
          {{ report.summary.totalHours }}h
        </div>
        <div class="text-xs text-slate-400 mt-1 font-medium">Total Hours Worked</div>
        <div class="text-[11px] text-slate-500 mt-0.5">{{ report.summary.formattedTotalHours }}</div>
      </div>

      <div class="stat-card">
        <div class="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style="background: rgba(168,85,247,0.12);">
          <UIcon name="i-heroicons-chart-pie" class="w-5 h-5 text-purple-400" />
        </div>
        <div class="text-2xl sm:text-3xl font-bold font-mono text-purple-300">
          {{ report.summary.formattedAvgBoundary }}
        </div>
        <div class="text-xs text-slate-400 mt-1 font-medium">Average Boundary</div>
        <div class="text-[11px] text-slate-500 mt-0.5">Per dispatch/shift</div>
      </div>
    </div>

    <!-- Visual Chart Component -->
    <div v-if="report && report.breakdown.length" class="glass-card p-5">
      <div class="flex items-center justify-between mb-5">
        <div>
          <h2 class="text-base font-semibold text-white capitalize">{{ period }} Boundary Breakdown</h2>
          <p class="text-xs text-slate-500 mt-0.5">Visual distribution of boundary amounts across {{ report.dateRange.displayLabel }}</p>
        </div>
        <div class="flex items-center gap-2 text-xs text-slate-400">
          <span class="w-3 h-3 rounded bg-gradient-to-t from-amber-600 to-amber-400 inline-block" />
          <span>Boundary Amount (₱)</span>
        </div>
      </div>

      <!-- Chart Bars -->
      <div class="pt-6 pb-2">
        <div class="flex items-end gap-2 sm:gap-3 overflow-x-auto min-h-[220px] pb-2">
          <div
            v-for="(item, idx) in report.breakdown"
            :key="idx"
            class="flex-1 min-w-[36px] sm:min-w-[48px] flex flex-col items-center group relative"
          >
            <!-- Hover Tooltip -->
            <div class="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center z-20 pointer-events-none">
              <div class="px-2.5 py-1.5 rounded-lg bg-slate-900/95 border border-white/10 text-center shadow-xl text-[11px] whitespace-nowrap">
                <p class="font-bold text-white">{{ item.label }} {{ item.subLabel ? `(${item.subLabel})` : '' }}</p>
                <p class="font-mono text-amber-400 font-semibold mt-0.5">₱{{ item.boundary.toLocaleString('en-PH') }}</p>
                <p class="text-slate-400 text-[10px] mt-0.5">{{ item.dispatches }} dispatch(es) • {{ item.totalHours }}h</p>
              </div>
              <div class="w-2 h-2 rotate-45 bg-slate-900/95 border-r border-b border-white/10 -mt-1" />
            </div>

            <!-- Value on top of bar -->
            <div class="text-[10px] font-mono font-semibold text-slate-400 group-hover:text-amber-300 transition-colors mb-1 truncate max-w-full text-center">
              <span v-if="item.boundary > 0">₱{{ (item.boundary >= 1000 ? (item.boundary / 1000).toFixed(1) + 'k' : item.boundary) }}</span>
              <span v-else class="text-slate-600">₱0</span>
            </div>

            <!-- Bar Pillar -->
            <div class="w-full h-40 bg-white/[0.03] rounded-t-lg flex items-end p-0.5 overflow-hidden">
              <div
                class="w-full rounded-t transition-all duration-500 group-hover:brightness-125"
                :style="{
                  height: `${Math.max(item.boundary > 0 ? 8 : 2, (item.boundary / maxBreakdownBoundary) * 100)}%`,
                  background: item.boundary > 0
                    ? 'linear-gradient(180deg, #fbbf24 0%, #d97706 100%)'
                    : 'rgba(255,255,255,0.06)'
                }"
              />
            </div>

            <!-- Label underneath -->
            <div class="text-center mt-2 w-full">
              <p class="text-[11px] font-medium text-slate-300 truncate">{{ item.label }}</p>
              <p v-if="item.subLabel" class="text-[9px] text-slate-500 truncate">{{ item.subLabel }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tabular Breakdown / Detailed Data Section -->
    <div v-if="report" class="space-y-6">
      <!-- 1. Weekly / Monthly / Yearly Period Summary Table (if not daily) -->
      <div v-if="period !== 'daily' && report.breakdown.length" class="glass-card overflow-hidden">
        <div class="px-5 py-4 border-b flex items-center justify-between" style="border-color: rgba(255,255,255,0.06);">
          <div>
            <h2 class="text-base font-semibold text-white capitalize">{{ period }} Summary Table</h2>
            <p class="text-xs text-slate-500 mt-0.5">Aggregated boundary and dispatch metrics by {{ period === 'yearly' ? 'month' : 'day' }}</p>
          </div>
          <span class="text-xs font-mono font-bold text-amber-400">
            Total: {{ report.summary.formattedTotalBoundary }}
          </span>
        </div>

        <div class="overflow-x-auto">
          <table class="data-table">
            <thead>
              <tr>
                <th>{{ period === 'yearly' ? 'Month' : 'Day / Date' }}</th>
                <th>Dispatches</th>
                <th>Hours Worked</th>
                <th class="text-right">Boundary Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(b, idx) in report.breakdown" :key="idx">
                <td>
                  <div class="flex items-center gap-2">
                    <span class="font-medium text-white">{{ b.label }}</span>
                    <span v-if="b.subLabel" class="text-xs text-slate-500">({{ b.subLabel }})</span>
                  </div>
                </td>
                <td>
                  <span :class="b.dispatches > 0 ? 'text-white font-medium' : 'text-slate-600'">
                    {{ b.dispatches }} {{ b.dispatches === 1 ? 'dispatch' : 'dispatches' }}
                  </span>
                </td>
                <td>
                  <span class="font-mono text-xs" :class="b.totalHours > 0 ? 'text-slate-300' : 'text-slate-600'">
                    {{ b.totalHours }} hrs
                  </span>
                </td>
                <td class="text-right">
                  <span
                    class="font-mono text-xs font-bold"
                    :class="b.boundary > 0 ? 'text-amber-400' : 'text-slate-600'"
                  >
                    ₱{{ b.boundary.toLocaleString('en-PH') }}
                  </span>
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="border-t font-semibold bg-white/[0.02]" style="border-color: rgba(255,255,255,0.08);">
                <td class="text-white">
                  {{ period === 'yearly' ? 'Annual Total' : 'Total' }}
                </td>
                <td class="text-white">{{ report.summary.totalDispatches }} dispatches</td>
                <td class="font-mono text-xs text-slate-300">{{ report.summary.totalHours }} hrs</td>
                <td class="text-right font-mono text-sm text-amber-400 font-bold">
                  {{ report.summary.formattedTotalBoundary }}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <!-- 2. Individual Dispatch Records Table -->
      <div class="glass-card overflow-hidden">
        <div class="px-5 py-4 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2" style="border-color: rgba(255,255,255,0.06);">
          <div>
            <h2 class="text-base font-semibold text-white">
              {{ period === 'daily' ? 'Daily Dispatch & Boundary Records' : 'Dispatch History for this Period' }}
            </h2>
            <p class="text-xs text-slate-500 mt-0.5">
              {{ report.records.length }} record(s) found for {{ report.dateRange.displayLabel }}
            </p>
          </div>
        </div>

        <div v-if="!report.records.length" class="p-12 text-center">
          <UIcon name="i-heroicons-document-text" class="w-10 h-10 text-slate-700 mx-auto mb-2" />
          <p class="text-slate-400 font-medium">No dispatch records found for this {{ period }}</p>
          <p class="text-slate-600 text-xs mt-1">Try navigating to a different date or period.</p>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Driver</th>
                <th>Assignment #</th>
                <th>Dispatch Time</th>
                <th>Return Time</th>
                <th>Duration</th>
                <th>Boundary</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="rec in report.records" :key="rec._id">
                <td class="whitespace-nowrap text-slate-300 text-xs">
                  {{ formatDateOnly(rec.timeIn) }}
                </td>
                <td>
                  <p class="font-medium text-white text-sm">{{ rec.driverName }}</p>
                  <p class="text-xs text-slate-500 font-mono">{{ rec.driverId }}</p>
                </td>
                <td>
                  <span class="font-mono text-xs text-green-400">{{ rec.assignmentNumber }}</span>
                </td>
                <td class="text-slate-400 text-xs whitespace-nowrap">
                  {{ formatTimeOnly(rec.timeIn) }}
                </td>
                <td class="text-slate-400 text-xs whitespace-nowrap">
                  <span v-if="rec.timeOut">{{ formatTimeOnly(rec.timeOut) }}</span>
                  <span v-else class="text-green-400 font-semibold text-[11px] animate-pulse">In Progress</span>
                </td>
                <td class="font-mono text-xs text-slate-300">
                  {{ rec.duration }}
                  <span v-if="rec.overtimeHours > 0" class="text-[10px] text-purple-400 block font-sans">
                    +{{ rec.overtimeHours }}h OT
                  </span>
                </td>
                <td>
                  <span
                    class="font-mono text-xs font-bold"
                    :class="rec.boundary > 0 ? 'text-amber-400' : 'text-slate-500'"
                  >
                    {{ rec.formattedBoundary }}
                  </span>
                </td>
                <td>
                  <span
                    :class="[
                      'px-2 py-0.5 rounded-full text-xs font-medium',
                      rec.status === 'Active' ? 'badge-active' : 'badge-completed'
                    ]"
                  >
                    {{ rec.status }}
                  </span>
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="border-t font-semibold bg-white/[0.02]" style="border-color: rgba(255,255,255,0.08);">
                <td colspan="5" class="text-white">
                  Total Dispatches: {{ report.summary.totalDispatches }}
                </td>
                <td class="font-mono text-xs text-slate-300">
                  {{ report.summary.totalHours }} hrs
                </td>
                <td class="font-mono text-sm text-amber-400 font-bold">
                  {{ report.summary.formattedTotalBoundary }}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.data-table tfoot td {
  padding: 0.875rem 1rem;
}
</style>
