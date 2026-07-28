<script setup lang="ts">
import { useDashboardStore } from '~/stores/dashboard'

definePageMeta({ layout: 'default', middleware: 'auth' })
useHead({ title: 'Dashboard — EFE Taxi Dispatch System' })

const dashboardStore = useDashboardStore()

onMounted(() => {
  dashboardStore.fetchStats()
})

const statCards = computed(() => {
  const s = dashboardStore.data?.stats
  if (!s) return []
  return [
    { label: 'Drivers Available', value: s.availableDrivers ?? 0, sub: `${s.activeDrivers ?? 0} On Duty`, icon: 'i-heroicons-user-group', color: '#4ade80', bg: 'rgba(34,197,94,0.1)' },
    { label: 'Taxis Available', value: s.availableTaxis ?? 0, sub: `${s.inUseTaxis ?? 0} In Use`, icon: 'i-lucide-car-taxi-front', color: '#f9a825', bg: 'rgba(249,168,37,0.1)' },
    { label: "Today's Assignments", value: s.todayAssignments ?? 0, sub: `${s.todayReturned ?? 0} Returned`, icon: 'i-heroicons-key', color: '#60a5fa', bg: 'rgba(59,130,246,0.1)' },
    { label: 'Avg. Hours Worked', value: s.avgHours ? `${s.avgHours}h` : '—', sub: 'All completed shifts', icon: 'i-heroicons-clock', color: '#a78bfa', bg: 'rgba(139,92,246,0.1)' }
  ]
})

const formatTime = (dateStr: string) =>
  new Date(dateStr).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: true })

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })

const getDriverName = (a: any) => typeof a.driver === 'object' ? a.driver.fullName : '—'
const getTaxiNumber = (a: any) => typeof a.taxiUnit === 'object' ? a.taxiUnit.taxiNumber : '—'
const getIssuedBy = (a: any) => typeof a.issuedBy === 'object' ? a.issuedBy.fullName : '—'
</script>

<template>
    <div class="p-6 space-y-6 animate-fadeIn">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-white">Dashboard</h1>
          <p class="text-sm text-slate-400 mt-0.5">Real-time fleet and assignment overview</p>
        </div>
        <div class="text-right text-xs text-slate-500">
          <div class="text-sm font-medium text-slate-300">
            {{ new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) }}
          </div>
        </div>
      </div>

      <!-- Loading skeleton -->
      <div v-if="dashboardStore.loading" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div v-for="i in 4" :key="i" class="stat-card animate-pulse">
          <div class="h-4 bg-white/5 rounded mb-3 w-2/3" />
          <div class="h-8 bg-white/5 rounded mb-2 w-1/2" />
          <div class="h-3 bg-white/5 rounded w-1/3" />
        </div>
      </div>

      <!-- Stat Cards -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div v-for="(card, idx) in statCards" :key="idx" class="stat-card">
          <div class="flex items-start justify-between mb-3">
            <div class="w-11 h-11 rounded-xl flex items-center justify-center" :style="{ background: card.bg }">
              <UIcon :name="card.icon" class="w-5 h-5" :style="{ color: card.color }" />
            </div>
            <div class="w-2 h-2 rounded-full" :style="{ background: card.color }" />
          </div>
          <div class="text-3xl font-bold text-white mb-1">{{ card.value }}</div>
          <div class="text-sm text-slate-400 font-medium">{{ card.label }}</div>
          <div class="text-xs mt-1" :style="{ color: card.color }">{{ card.sub }}</div>
        </div>
      </div>

      <!-- Charts row -->
      <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <!-- Weekly Trend -->
        <div class="xl:col-span-2 glass-card p-5">
          <div class="flex items-center justify-between mb-5">
            <div>
              <h2 class="text-base font-semibold text-white">Weekly Assignment Trend</h2>
              <p class="text-xs text-slate-500 mt-0.5">Last 7 days</p>
            </div>
            <UIcon name="i-heroicons-chart-bar" class="w-5 h-5 text-slate-500" />
          </div>
          <div v-if="dashboardStore.data?.weeklyTrend?.length" class="space-y-2">
            <div v-for="point in dashboardStore.data.weeklyTrend" :key="point.date" class="flex items-center gap-3">
              <div class="text-xs text-slate-500 w-20 shrink-0">
                {{ new Date(point.date + 'T12:00:00').toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' }) }}
              </div>
              <div class="flex-1 h-7 rounded-md relative overflow-hidden" style="background: rgba(255,255,255,0.04);">
                <div
                  class="h-full rounded-md transition-all duration-700"
                  :style="{
                    width: dashboardStore.data?.weeklyTrend
                      ? `${Math.max(2, (point.count / Math.max(...dashboardStore.data.weeklyTrend.map(p => p.count), 1)) * 100)}%`
                      : '0%',
                    background: 'linear-gradient(90deg, #16a34a, #4ade80)'
                  }"
                />
              </div>
              <div class="text-sm font-bold text-white w-5 text-right shrink-0">{{ point.count }}</div>
            </div>
          </div>
          <div v-else class="h-40 flex items-center justify-center text-slate-500 text-sm">No assignment data yet</div>
        </div>

        <!-- Fleet Status -->
        <div class="glass-card p-5">
          <div class="flex items-center justify-between mb-5">
            <div>
              <h2 class="text-base font-semibold text-white">Fleet Status</h2>
              <p class="text-xs text-slate-500 mt-0.5">Current taxi unit status</p>
            </div>
            <UIcon name="i-heroicons-chart-pie" class="w-5 h-5 text-slate-500" />
          </div>
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <span class="badge-available px-2 py-0.5 rounded-full text-xs font-medium">Available</span>
              <span class="text-lg font-bold text-white">{{ dashboardStore.data?.stats?.availableTaxis ?? '—' }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="badge-active px-2 py-0.5 rounded-full text-xs font-medium">In Use</span>
              <span class="text-lg font-bold text-white">{{ dashboardStore.data?.stats?.inUseTaxis ?? '—' }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="badge-maintenance px-2 py-0.5 rounded-full text-xs font-medium">Maintenance</span>
              <span class="text-lg font-bold text-white">{{ dashboardStore.data?.stats?.maintenanceTaxis ?? '—' }}</span>
            </div>
          </div>
          <div class="mt-6 pt-5 border-t" style="border-color: rgba(255,255,255,0.06);">
            <p class="text-xs font-medium text-slate-400 mb-3 uppercase tracking-wider">Driver Status</p>
            <div class="space-y-2.5">
              <div class="flex items-center justify-between text-sm">
                <span class="text-slate-400">Available</span>
                <span class="badge-available px-2 py-0.5 rounded-full text-xs font-medium">{{ dashboardStore.data?.stats?.availableDrivers ?? '—' }}</span>
              </div>
              <div class="flex items-center justify-between text-sm">
                <span class="text-slate-400">On Duty</span>
                <span class="badge-active px-2 py-0.5 rounded-full text-xs font-medium">{{ dashboardStore.data?.stats?.activeDrivers ?? '—' }}</span>
              </div>
            </div>
          </div>
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
          <NuxtLink to="/assignments" class="text-xs text-green-400 hover:text-green-300 transition-colors flex items-center gap-1">
            View all <UIcon name="i-heroicons-arrow-right" class="w-3 h-3" />
          </NuxtLink>
        </div>
        <div v-if="dashboardStore.loading" class="p-5 text-center text-slate-500 text-sm">Loading...</div>
        <div v-else-if="!dashboardStore.data?.activeAssignments?.length" class="p-10 text-center">
          <UIcon name="i-heroicons-inbox" class="w-10 h-10 text-slate-700 mx-auto mb-2" />
          <p class="text-slate-500 text-sm">No active assignments</p>
        </div>
        <div v-else class="overflow-x-auto">
          <table class="data-table">
            <thead>
              <tr>
                <th>Assignment #</th>
                <th>Driver</th>
                <th>Taxi</th>
                <th>Issued By</th>
                <th>Time In</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="a in dashboardStore.data.activeAssignments" :key="a._id">
                <td><span class="font-mono text-xs text-green-400">{{ a.assignmentNumber }}</span></td>
                <td class="text-white font-medium">{{ getDriverName(a) }}</td>
                <td class="text-slate-300">{{ getTaxiNumber(a) }}</td>
                <td class="text-slate-400 text-sm">{{ getIssuedBy(a) }}</td>
                <td class="text-slate-400 text-xs">{{ formatDate(a.assignedAt) }} {{ formatTime(a.assignedAt) }}</td>
                <td>
                  <span class="badge-active px-2 py-0.5 rounded-full text-xs font-medium">Active</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
</template>
