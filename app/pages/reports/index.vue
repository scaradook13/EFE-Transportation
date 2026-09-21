<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import { formatTaxiType, formatBoundaryCurrency } from '~~/shared/utils/boundary'
import type { ReportPeriod, BoundaryReportData, FleetBoundaryReportData, TaxiUnit } from '~/types'

definePageMeta({ layout: 'default', middleware: 'auth' })
useHead({ title: 'PDF Reports — EFE Taxi Dispatch System' })

const authStore = useAuthStore()
const router = useRouter()
const toast = useToast()

// Role-based access control: Admin and Dispatcher only
if (!authStore.isAdmin && !authStore.isDispatcher) {
  router.push('/')
}

// ----------------------------------------------------
// State
// ----------------------------------------------------
const reportType = ref<'taxi' | 'fleet'>('taxi')
const period = ref<ReportPeriod>('daily')

// Date range inputs
const todayStr = new Date().toISOString().substring(0, 10)
const currentMonthStr = new Date().toISOString().substring(0, 7)
const currentYear = new Date().getFullYear()

const selectedDate = ref(todayStr)
const selectedMonth = ref(currentMonthStr)
const selectedYear = ref(currentYear)
const customStartDate = ref(todayStr)
const customEndDate = ref(todayStr)

// Taxi Units
const taxiUnits = ref<TaxiUnit[]>([])
const selectedTaxiId = ref('')
const taxisLoading = ref(false)

// Report Data
const previewLoading = ref(false)
const pdfLoading = ref(false)
const taxiReport = ref<BoundaryReportData | null>(null)
const fleetReport = ref<FleetBoundaryReportData | null>(null)
const previewError = ref('')

// Periods list
const periods: { label: string; value: ReportPeriod }[] = [
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
  { label: 'Yearly', value: 'yearly' },
  { label: 'Custom Range', value: 'custom' }
]

// ----------------------------------------------------
// Validation
// ----------------------------------------------------
const dateValidationError = computed(() => {
  if (period.value === 'custom') {
    if (!customStartDate.value || !customEndDate.value) {
      return 'Please specify both start date and end date.'
    }
    if (customEndDate.value < customStartDate.value) {
      return 'End date cannot be earlier than start date.'
    }
  }
  return ''
})

const canGeneratePdf = computed(() => {
  if (previewLoading.value || pdfLoading.value) return false
  if (dateValidationError.value) return false
  if (reportType.value === 'taxi' && !selectedTaxiId.value) return false
  return true
})

// ----------------------------------------------------
// Taxi units loading
// ----------------------------------------------------
const loadTaxiUnits = async () => {
  taxisLoading.value = true
  try {
    const res = await $fetch<{ success: boolean; data: TaxiUnit[] }>('/api/taxi-units', {
      query: { limit: 200 }
    })
    taxiUnits.value = res.data || []
    if (taxiUnits.value.length > 0 && !selectedTaxiId.value) {
      selectedTaxiId.value = taxiUnits.value[0]._id
    }
  } catch (err: any) {
    console.error('Failed to load taxis:', err)
  } finally {
    taxisLoading.value = false
  }
}

// ----------------------------------------------------
// Report Preview Loader
// ----------------------------------------------------
const fetchPreviewData = async () => {
  if (dateValidationError.value) {
    taxiReport.value = null
    fleetReport.value = null
    return
  }

  if (reportType.value === 'taxi' && !selectedTaxiId.value) {
    return
  }

  previewLoading.value = true
  previewError.value = ''

  try {
    const query: Record<string, string> = {
      type: reportType.value,
      period: period.value
    }

    if (reportType.value === 'taxi') {
      query.taxiId = selectedTaxiId.value
    }

    if (period.value === 'custom') {
      query.startDate = customStartDate.value
      query.endDate = customEndDate.value
    } else if (period.value === 'monthly') {
      query.date = `${selectedMonth.value}-01`
    } else if (period.value === 'yearly') {
      query.date = `${selectedYear.value}-01-01`
    } else {
      query.date = selectedDate.value
    }

    const res = await $fetch<{ success: boolean; data: any }>('/api/reports/boundary/data', { query })

    if (reportType.value === 'taxi') {
      taxiReport.value = res.data as BoundaryReportData
      fleetReport.value = null
    } else {
      fleetReport.value = res.data as FleetBoundaryReportData
      taxiReport.value = null
    }
  } catch (err: any) {
    previewError.value = err?.data?.message || err?.message || 'Failed to load report preview'
  } finally {
    previewLoading.value = false
  }
}

// ----------------------------------------------------
// PDF Generation & Download
// ----------------------------------------------------
const downloadPdf = async () => {
  if (!canGeneratePdf.value) return

  pdfLoading.value = true
  try {
    const query = new URLSearchParams()
    query.set('type', reportType.value)
    query.set('period', period.value)

    if (reportType.value === 'taxi') {
      query.set('taxiId', selectedTaxiId.value)
    }

    if (period.value === 'custom') {
      query.set('startDate', customStartDate.value)
      query.set('endDate', customEndDate.value)
    } else if (period.value === 'monthly') {
      query.set('date', `${selectedMonth.value}-01`)
    } else if (period.value === 'yearly') {
      query.set('date', `${selectedYear.value}-01-01`)
    } else {
      query.set('date', selectedDate.value)
    }

    const response = await fetch(`/api/reports/boundary/pdf?${query.toString()}`)
    if (!response.ok) {
      const errJson = await response.json().catch(() => null)
      throw new Error(errJson?.message || `Server responded with status ${response.status}`)
    }

    // Extract filename from header or build fallback
    const disposition = response.headers.get('Content-Disposition')
    let filename = ''
    if (disposition && disposition.includes('filename=')) {
      const match = disposition.match(/filename="?([^"]+)"?/)
      if (match && match[1]) {
        filename = match[1]
      }
    }

    if (!filename) {
      filename = reportType.value === 'taxi'
        ? `Taxi_Boundary_Report_${period.value}.pdf`
        : `Fleet_Income_Report_${period.value}.pdf`
    }

    const blob = await response.blob()
    const blobUrl = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = blobUrl
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(blobUrl)

    toast.add({
      title: 'PDF Report Generated',
      description: `Successfully downloaded ${filename}`,
      color: 'green'
    })
  } catch (err: any) {
    toast.add({
      title: 'PDF Generation Failed',
      description: err.message || 'Unable to generate PDF report',
      color: 'red'
    })
  } finally {
    pdfLoading.value = false
  }
}

// ----------------------------------------------------
// Watchers & Lifecycle
// ----------------------------------------------------
onMounted(async () => {
  await loadTaxiUnits()
  await fetchPreviewData()
})

watch(
  [
    reportType,
    period,
    selectedTaxiId,
    selectedDate,
    selectedMonth,
    selectedYear,
    customStartDate,
    customEndDate
  ],
  () => {
    fetchPreviewData()
  }
)

const selectedTaxiObj = computed(() => {
  return taxiUnits.value.find(t => t._id === selectedTaxiId.value)
})
</script>

<template>
  <div class="p-4 sm:p-6 lg:p-8 space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <div class="flex items-center gap-3">
          <h1 class="text-2xl font-bold text-white tracking-tight">PDF Reports</h1>
          <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            Boundary & Income
          </span>
        </div>
        <p class="text-sm text-slate-400 mt-1">
          Configure, preview, and generate official PDF boundary & financial reports for taxi units or the entire fleet.
        </p>
      </div>

      <!-- Quick Action: Generate PDF -->
      <div class="flex items-center gap-3">
        <button
          type="button"
          :disabled="!canGeneratePdf"
          class="btn-primary flex items-center gap-2 shadow-lg transition-all"
          :class="{ 'opacity-50 cursor-not-allowed': !canGeneratePdf }"
          @click="downloadPdf"
        >
          <UIcon
            :name="pdfLoading ? 'i-heroicons-arrow-path' : 'i-heroicons-document-arrow-down'"
            class="w-5 h-5"
            :class="{ 'animate-spin': pdfLoading }"
          />
          <span>{{ pdfLoading ? 'Generating PDF...' : 'Generate PDF' }}</span>
        </button>
      </div>
    </div>

    <!-- Configuration Control Panel -->
    <div class="glass-card p-5 space-y-5">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <!-- 1. Report Type Selection -->
        <div class="space-y-2">
          <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400">
            Report Type
          </label>
          <div class="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-900/60 border border-white/5">
            <button
              type="button"
              class="flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all"
              :class="reportType === 'taxi'
                ? 'bg-blue-600 text-white shadow-md font-semibold'
                : 'text-slate-400 hover:text-white hover:bg-white/5'"
              @click="reportType = 'taxi'"
            >
              <UIcon name="i-lucide-car-taxi-front" class="w-4 h-4" />
              <span>Specific Taxi</span>
            </button>
            <button
              type="button"
              class="flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all"
              :class="reportType === 'fleet'
                ? 'bg-blue-600 text-white shadow-md font-semibold'
                : 'text-slate-400 hover:text-white hover:bg-white/5'"
              @click="reportType = 'fleet'"
            >
              <UIcon name="i-heroicons-squares-2x2" class="w-4 h-4" />
              <span>Overall Fleet</span>
            </button>
          </div>
        </div>

        <!-- 2. Specific Taxi Selector (Conditional) -->
        <div v-if="reportType === 'taxi'" class="space-y-2">
          <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400">
            Select Taxi Unit
          </label>
          <div v-if="taxisLoading" class="text-xs text-slate-500 py-2.5">
            Loading taxi units...
          </div>
          <select
            v-else
            v-model="selectedTaxiId"
            class="form-input text-sm"
          >
            <option
              v-for="taxi in taxiUnits"
              :key="taxi._id"
              :value="taxi._id"
            >
              Taxi #{{ taxi.taxiNumber }} — {{ formatTaxiType(taxi.taxiType) }} — {{ taxi.plateNumber }} ({{ taxi.brand }} {{ taxi.model }})
            </option>
          </select>
        </div>

        <!-- 2. Fleet Meta Info Placeholder (When Fleet is selected) -->
        <div v-else class="space-y-2">
          <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400">
            Fleet Overview
          </label>
          <div class="h-[42px] px-3.5 py-2 rounded-lg bg-white/5 border border-white/10 flex items-center justify-between text-sm">
            <span class="text-slate-300 font-medium">All Registered Taxis</span>
            <span class="text-xs font-semibold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
              {{ taxiUnits.length }} Units
            </span>
          </div>
        </div>

        <!-- 3. Timeline Mode Selection -->
        <div class="space-y-2">
          <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400">
            Timeline Mode
          </label>
          <div class="flex items-center gap-1.5 flex-wrap">
            <button
              v-for="p in periods"
              :key="p.value"
              type="button"
              class="px-3 py-2 rounded-lg text-xs font-medium transition-all"
              :class="period === p.value
                ? 'bg-green-600 text-white font-semibold shadow'
                : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 border border-white/5'"
              @click="period = p.value"
            >
              {{ p.label }}
            </button>
          </div>
        </div>
      </div>

      <!-- Date Pickers Row -->
      <div class="pt-4 border-t border-white/5">
        <!-- Daily / Weekly Date Picker -->
        <div v-if="period === 'daily' || period === 'weekly'" class="max-w-xs space-y-1.5">
          <label class="block text-xs font-semibold text-slate-400">
            {{ period === 'daily' ? 'Select Date:' : 'Select Anchor Date (for 7-Day Week):' }}
          </label>
          <input
            v-model="selectedDate"
            type="date"
            class="form-input text-sm"
          />
        </div>

        <!-- Monthly Date Picker -->
        <div v-else-if="period === 'monthly'" class="max-w-xs space-y-1.5">
          <label class="block text-xs font-semibold text-slate-400">
            Select Month:
          </label>
          <input
            v-model="selectedMonth"
            type="month"
            class="form-input text-sm"
          />
        </div>

        <!-- Yearly Date Picker -->
        <div v-else-if="period === 'yearly'" class="max-w-xs space-y-1.5">
          <label class="block text-xs font-semibold text-slate-400">
            Select Year:
          </label>
          <input
            v-model.number="selectedYear"
            type="number"
            min="2020"
            max="2035"
            step="1"
            class="form-input text-sm"
          />
        </div>

        <!-- Custom Date Range Pickers -->
        <div v-else-if="period === 'custom'" class="space-y-2">
          <div class="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div class="w-full sm:w-auto space-y-1.5">
              <label class="block text-xs font-semibold text-slate-400">From Date:</label>
              <input
                v-model="customStartDate"
                type="date"
                class="form-input text-sm"
              />
            </div>
            <div class="w-full sm:w-auto space-y-1.5">
              <label class="block text-xs font-semibold text-slate-400">To Date:</label>
              <input
                v-model="customEndDate"
                type="date"
                class="form-input text-sm"
              />
            </div>
          </div>
          <!-- Validation Warning -->
          <p v-if="dateValidationError" class="text-xs text-red-400 font-medium flex items-center gap-1.5 mt-1">
            <UIcon name="i-heroicons-exclamation-circle" class="w-4 h-4" />
            <span>{{ dateValidationError }}</span>
          </p>
        </div>
      </div>
    </div>

    <!-- Live Preview Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <h2 class="text-base font-semibold text-white">Live Report Preview</h2>
        <span v-if="previewLoading" class="text-xs text-slate-500 flex items-center gap-1">
          <UIcon name="i-heroicons-arrow-path" class="w-3.5 h-3.5 animate-spin" />
          Updating...
        </span>
      </div>

      <div class="text-xs text-slate-400 font-mono">
        <span v-if="taxiReport">Period: {{ taxiReport.dateRange.displayLabel }}</span>
        <span v-else-if="fleetReport">Period: {{ fleetReport.dateRange.displayLabel }}</span>
      </div>
    </div>

    <!-- Preview Error Notice -->
    <div v-if="previewError" class="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
      {{ previewError }}
    </div>

    <!-- 4 KPI Summary Cards -->
    <div v-if="taxiReport || fleetReport" class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- Card 1: Total Boundary -->
      <div class="stat-card">
        <div class="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style="background: rgba(37,99,235,0.15);">
          <UIcon name="i-heroicons-banknotes" class="w-5 h-5 text-blue-400" />
        </div>
        <div class="text-2xl sm:text-3xl font-bold font-mono text-blue-400">
          {{ taxiReport ? taxiReport.summary.formattedTotalBoundary : fleetReport?.summary.formattedTotalBoundary }}
        </div>
        <div class="text-xs text-slate-400 mt-1 font-medium">
          {{ reportType === 'taxi' ? 'Total Boundary' : 'Fleet Total Boundary' }}
        </div>
        <div class="text-[11px] text-slate-500 mt-0.5 capitalize">{{ period }} earnings</div>
      </div>

      <!-- Card 2: Dispatches / Shifts -->
      <div class="stat-card">
        <div class="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style="background: rgba(34,197,94,0.15);">
          <UIcon name="i-heroicons-key" class="w-5 h-5 text-green-400" />
        </div>
        <div class="text-2xl sm:text-3xl font-bold text-white">
          {{ taxiReport ? taxiReport.summary.totalDispatches : fleetReport?.summary.totalDispatches }}
        </div>
        <div class="text-xs text-slate-400 mt-1 font-medium">Total Dispatches</div>
        <div class="text-[11px] text-slate-500 mt-0.5">Trips in period</div>
      </div>

      <!-- Card 3: Hours Worked -->
      <div class="stat-card">
        <div class="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style="background: rgba(249,168,37,0.15);">
          <UIcon name="i-heroicons-clock" class="w-5 h-5 text-amber-400" />
        </div>
        <div class="text-2xl sm:text-3xl font-bold font-mono text-white">
          {{ taxiReport ? `${taxiReport.summary.totalHours}h` : `${fleetReport?.summary.totalHours}h` }}
        </div>
        <div class="text-xs text-slate-400 mt-1 font-medium">Total Duty Hours</div>
        <div class="text-[11px] text-slate-500 mt-0.5">
          {{ taxiReport ? taxiReport.summary.formattedTotalHours : fleetReport?.summary.formattedTotalHours }}
        </div>
      </div>

      <!-- Card 4: Average Boundary -->
      <div class="stat-card">
        <div class="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style="background: rgba(168,85,247,0.15);">
          <UIcon name="i-heroicons-chart-pie" class="w-5 h-5 text-purple-400" />
        </div>
        <div class="text-2xl sm:text-3xl font-bold font-mono text-purple-300">
          {{ taxiReport ? taxiReport.summary.formattedAvgBoundary : fleetReport?.summary.formattedAvgBoundaryPerTaxi }}
        </div>
        <div class="text-xs text-slate-400 mt-1 font-medium">
          {{ reportType === 'taxi' ? 'Average / Dispatch' : 'Average / Taxi Unit' }}
        </div>
        <div class="text-[11px] text-slate-500 mt-0.5">Calculated average</div>
      </div>
    </div>

    <!-- Data Table Preview: Specific Taxi -->
    <div v-if="reportType === 'taxi' && taxiReport" class="glass-card overflow-hidden">
      <div class="p-4 border-b border-white/5 flex items-center justify-between">
        <div>
          <h3 class="text-sm font-semibold text-white">
            Taxi #{{ taxiReport.taxi.taxiNumber }} Dispatch Records
          </h3>
          <p class="text-xs text-slate-400">
            {{ taxiReport.taxi.brand }} {{ taxiReport.taxi.model }} • Plate: {{ taxiReport.taxi.plateNumber }} • Type: {{ taxiReport.taxi.formattedTaxiType }}
          </p>
        </div>
        <span class="text-xs text-slate-400">
          {{ taxiReport.records.length }} records found
        </span>
      </div>

      <div class="overflow-x-auto">
        <table class="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Driver</th>
              <th>Time In</th>
              <th>Time Out</th>
              <th>Duration</th>
              <th>Status</th>
              <th class="text-right">Boundary</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="taxiReport.records.length === 0">
              <td colspan="7" class="text-center py-8 text-slate-500 text-sm italic">
                No boundary records found for the selected period.
              </td>
            </tr>
            <tr
              v-for="rec in taxiReport.records"
              :key="rec._id"
            >
              <td class="font-mono text-xs">
                {{ rec.timeIn ? new Date(rec.timeIn).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—' }}
              </td>
              <td class="font-medium text-white">
                {{ rec.driverName }}
              </td>
              <td class="text-xs font-mono text-slate-300">
                {{ rec.timeIn ? new Date(rec.timeIn).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—' }}
              </td>
              <td class="text-xs font-mono text-slate-300">
                {{ rec.timeOut ? new Date(rec.timeOut).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'Active Deployment' }}
              </td>
              <td class="text-xs font-mono text-slate-300">
                {{ rec.duration }}
              </td>
              <td>
                <span
                  class="px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize"
                  :class="rec.status === 'Active' ? 'badge-active' : 'badge-completed'"
                >
                  {{ rec.status }}
                </span>
              </td>
              <td class="text-right font-mono font-bold" :class="rec.status === 'Active' ? 'text-green-400' : 'text-white'">
                {{ rec.formattedBoundary }}
              </td>
            </tr>
          </tbody>
          <tfoot v-if="taxiReport.records.length > 0">
            <tr class="bg-white/5 font-semibold text-white">
              <td colspan="4" class="py-3 text-xs uppercase tracking-wider text-slate-400">Total</td>
              <td class="py-3 text-xs font-mono">{{ taxiReport.summary.formattedTotalHours }}</td>
              <td class="py-3 text-xs">{{ taxiReport.summary.totalDispatches }} shifts</td>
              <td class="py-3 text-right text-sm font-mono text-green-400 font-bold">
                {{ taxiReport.summary.formattedTotalBoundary }}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>

    <!-- Data Table Preview: Overall Fleet -->
    <div v-if="reportType === 'fleet' && fleetReport" class="glass-card overflow-hidden">
      <div class="p-4 border-b border-white/5 flex items-center justify-between">
        <div>
          <h3 class="text-sm font-semibold text-white">
            Fleet Vehicle Performance Summary
          </h3>
          <p class="text-xs text-slate-400">
            Aggregated boundary revenue across all {{ fleetReport.taxis.length }} registered taxis
          </p>
        </div>
        <span class="text-xs text-slate-400">
          {{ fleetReport.summary.activeTaxisInPeriod }} Active Units with Dispatches
        </span>
      </div>

      <div class="overflow-x-auto">
        <table class="data-table">
          <thead>
            <tr>
              <th>Taxi #</th>
              <th>Type</th>
              <th>Plate No.</th>
              <th>Vehicle</th>
              <th class="text-center">Dispatches</th>
              <th class="text-center">Duty Hours</th>
              <th class="text-right">Boundary Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="fleetReport.taxis.length === 0">
              <td colspan="7" class="text-center py-8 text-slate-500 text-sm italic">
                No taxi units registered.
              </td>
            </tr>
            <tr
              v-for="taxi in fleetReport.taxis"
              :key="taxi._id"
            >
              <td class="font-bold text-white font-mono">
                #{{ taxi.taxiNumber }}
              </td>
              <td>
                <span
                  class="px-2 py-0.5 rounded-full text-[11px] font-semibold"
                  :class="taxi.taxiType === 'SUPERMAN' ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30' : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'"
                >
                  {{ taxi.formattedTaxiType }}
                </span>
              </td>
              <td class="font-mono text-xs text-slate-300">
                {{ taxi.plateNumber }}
              </td>
              <td class="text-xs text-slate-300">
                {{ taxi.vehicle }}
              </td>
              <td class="text-center font-mono text-xs">
                {{ taxi.dispatches }}
              </td>
              <td class="text-center font-mono text-xs">
                {{ taxi.totalHours }}h
              </td>
              <td class="text-right font-mono font-bold" :class="taxi.boundary > 0 ? 'text-white' : 'text-slate-500'">
                {{ taxi.formattedBoundary }}
              </td>
            </tr>
          </tbody>
          <tfoot v-if="fleetReport.taxis.length > 0">
            <tr class="bg-white/5 font-semibold text-white">
              <td colspan="4" class="py-3 text-xs uppercase tracking-wider text-slate-400">Fleet Total</td>
              <td class="py-3 text-center text-xs font-mono">{{ fleetReport.summary.totalDispatches }} shifts</td>
              <td class="py-3 text-center text-xs font-mono">{{ fleetReport.summary.formattedTotalHours }}</td>
              <td class="py-3 text-right text-sm font-mono text-green-400 font-bold">
                {{ fleetReport.summary.formattedTotalBoundary }}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  </div>
</template>
