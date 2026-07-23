<script setup lang="ts">
import { useDashboardStore } from '~/stores/dashboard'
import type { Dispatch } from '~/types'

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
    { label: 'Total Drivers', value: s.totalDrivers, sub: `${s.activeDrivers} Active`, icon: 'i-heroicons-user-group', color: '#4ade80', bg: 'rgba(34,197,94,0.1)' },
    { label: 'Taxi Fleet', value: s.totalTaxis, sub: `${s.availableTaxis} Available`, icon: 'i-heroicons-truck', color: '#f9a825', bg: 'rgba(249,168,37,0.1)' },
    { label: 'Active Dispatches', value: s.activeDispatches, sub: `${s.todayDispatches} Today`, icon: 'i-heroicons-map-pin', color: '#60a5fa', bg: 'rgba(59,130,246,0.1)' },
    { label: 'Completed Trips', value: s.completedDispatches, sub: `${s.cancelledDispatches} Cancelled`, icon: 'i-heroicons-check-circle', color: '#a78bfa', bg: 'rgba(139,92,246,0.1)' }
  ]
})

const statusData = computed(() => {
  const s = dashboardStore.data?.stats
  if (!s) return []
  return [
    { label: 'Active', count: s.activeDispatches, color: 'badge-active' },
    { label: 'Completed', count: s.completedDispatches, color: 'badge-completed' },
    { label: 'Cancelled', count: s.cancelledDispatches, color: 'badge-cancelled' }
  ]
})

const getDriverName = (dispatch: Dispatch): string => {
  return typeof dispatch.driver === 'object' ? dispatch.driver.fullName : 'N/A'
}

const getTaxiNumber = (dispatch: Dispatch): string => {
  return typeof dispatch.taxiUnit === 'object' ? dispatch.taxiUnit.taxiNumber : 'N/A'
}

const formatTime = (dateStr: string) => {
  return new Date(dateStr).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: true })
}

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
}
</script>

<template>
  <NuxtLayout name="default">
    <div class="p-6 space-y-6 animate-fadeIn">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-white">Dashboard</h1>
          <p class="text-sm text-slate-400 mt-0.5">Real-time fleet and dispatch overview</p>
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
        <div
          v-for="(card, idx) in statCards"
          :key="idx"
          class="stat-card"
        >
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
              <h2 class="text-base font-semibold text-white">Weekly Dispatch Trend</h2>
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
          <div v-else class="h-40 flex items-center justify-center text-slate-500 text-sm">No trend data yet</div>
        </div>

        <!-- Status breakdown -->
        <div class="glass-card p-5">
          <div class="flex items-center justify-between mb-5">
            <div>
              <h2 class="text-base font-semibold text-white">Dispatch Status</h2>
              <p class="text-xs text-slate-500 mt-0.5">All time</p>
            </div>
            <UIcon name="i-heroicons-chart-pie" class="w-5 h-5 text-slate-500" />
          </div>
          <div class="space-y-3">
            <div v-for="item in statusData" :key="item.label" class="flex items-center justify-between">
              <span :class="['px-2 py-0.5 rounded-full text-xs font-medium', item.color]">{{ item.label }}</span>
              <span class="text-lg font-bold text-white">{{ item.count }}</span>
            </div>
          </div>
          <div class="mt-6 pt-5 border-t" style="border-color: rgba(255,255,255,0.06);">
            <p class="text-xs font-medium text-slate-400 mb-3 uppercase tracking-wider">Fleet Status</p>
            <div class="space-y-2.5">
              <div class="flex items-center justify-between text-sm">
                <span class="text-slate-400">Available</span>
                <span class="badge-available px-2 py-0.5 rounded-full text-xs font-medium">{{ dashboardStore.data?.stats.availableTaxis ?? '—' }}</span>
              </div>
              <div class="flex items-center justify-between text-sm">
                <span class="text-slate-400">On Trip</span>
                <span class="badge-on-trip px-2 py-0.5 rounded-full text-xs font-medium">{{ dashboardStore.data?.stats.onTripTaxis ?? '—' }}</span>
              </div>
              <div class="flex items-center justify-between text-sm">
                <span class="text-slate-400">Maintenance</span>
                <span class="badge-maintenance px-2 py-0.5 rounded-full text-xs font-medium">{{ dashboardStore.data?.stats.maintenanceTaxis ?? '—' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Dispatches -->
      <div class="glass-card overflow-hidden">
        <div class="px-5 py-4 border-b flex items-center justify-between" style="border-color: rgba(255,255,255,0.06);">
          <div>
            <h2 class="text-base font-semibold text-white">Recent Dispatches</h2>
            <p class="text-xs text-slate-500 mt-0.5">Latest 5 dispatch records</p>
          </div>
          <NuxtLink to="/dispatches" class="text-xs text-green-400 hover:text-green-300 transition-colors flex items-center gap-1">
            View all <UIcon name="i-heroicons-arrow-right" class="w-3 h-3" />
          </NuxtLink>
        </div>
        <div v-if="dashboardStore.loading" class="p-5 text-center text-slate-500 text-sm">Loading...</div>
        <div v-else-if="!dashboardStore.data?.recentDispatches?.length" class="p-10 text-center">
          <UIcon name="i-heroicons-inbox" class="w-10 h-10 text-slate-700 mx-auto mb-2" />
          <p class="text-slate-500 text-sm">No dispatches yet</p>
        </div>
        <div v-else class="overflow-x-auto">
          <table class="data-table">
            <thead>
              <tr>
                <th>Dispatch #</th>
                <th>Passenger</th>
                <th>Driver</th>
                <th>Taxi</th>
                <th>Departure</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="dispatch in dashboardStore.data.recentDispatches" :key="dispatch._id">
                <td><span class="font-mono text-xs text-slate-300">{{ dispatch.dispatchNumber }}</span></td>
                <td class="text-white font-medium">{{ dispatch.passengerName }}</td>
                <td>{{ getDriverName(dispatch) }}</td>
                <td>{{ getTaxiNumber(dispatch) }}</td>
                <td class="text-slate-400 text-xs">{{ formatDate(dispatch.departureTime) }} {{ formatTime(dispatch.departureTime) }}</td>
                <td>
                  <span :class="[
                    'px-2 py-0.5 rounded-full text-xs font-medium',
                    dispatch.status === 'Active' ? 'badge-active' : dispatch.status === 'Completed' ? 'badge-completed' : 'badge-cancelled'
                  ]">{{ dispatch.status }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </NuxtLayout>
</template>
