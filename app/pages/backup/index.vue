<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

definePageMeta({ layout: 'default', middleware: 'auth' })
useHead({ title: 'Backup & Restore — EFE Taxi Dispatch System' })

const authStore = useAuthStore()
const router = useRouter()
const toast = useToast()

// Guard: Only admins can access
if (!authStore.isAdmin) {
  router.push('/')
}

interface CollectionStat {
  name: string
  count: number
}

interface BackupStats {
  databaseName: string
  totalCollections: number
  totalDocuments: number
  collections: CollectionStat[]
}

interface AutomatedDaily {
  exists: boolean
  filename: string
  sizeBytes: number
  sizeFormatted: string
  lastModified: string | null
  totalDocuments: number
  totalCollections: number
  exportedAt?: string
  nextSchedule: string
}

interface MonthlyArchive {
  filename: string
  monthKey: string
  monthLabel: string
  sizeBytes: number
  sizeFormatted: string
  createdAt: string
  totalDocuments: number
  totalCollections: number
  exportedAt?: string
}

interface AutoBackupStatus {
  daily: AutomatedDaily
  monthly: MonthlyArchive[]
}

const stats = ref<BackupStats | null>(null)
const loadingStats = ref(true)
const downloading = ref(false)
const restoring = ref(false)

const autoStatus = ref<AutoBackupStatus | null>(null)
const loadingAutoStatus = ref(true)
const runningAutoBackup = ref(false)

// File upload state for manual restore
const fileInput = ref<HTMLInputElement | null>(null)
const selectedFile = ref<File | null>(null)
const filePreview = ref<{
  filename: string
  sizeFormatted: string
  system?: string
  exportedAt?: string
  exportedBy?: string
  totalDocuments?: number
  collections: { name: string; count: number }[]
} | null>(null)

// Generic restore target modal state
const showConfirmModal = ref(false)
const restoreTarget = ref<{
  type: 'upload' | 'daily' | 'monthly'
  title: string
  filename: string
  totalDocuments?: number
  collectionsCount?: number
} | null>(null)

const errorMessage = ref('')

const loadStats = async () => {
  loadingStats.value = true
  errorMessage.value = ''
  try {
    const res = await $fetch<{ success: boolean; data: BackupStats }>('/api/admin/backup/stats')
    if (res.success && res.data) {
      stats.value = res.data
    }
  } catch (err: any) {
    errorMessage.value = err.data?.message || 'Failed to load database stats'
  } finally {
    loadingStats.value = false
  }
}

const loadAutoStatus = async () => {
  loadingAutoStatus.value = true
  try {
    const res = await $fetch<{ success: boolean; data: AutoBackupStatus }>('/api/admin/backup/auto-status')
    if (res.success && res.data) {
      autoStatus.value = res.data
    }
  } catch (err: any) {
    console.error('Failed to load automated backup status:', err)
  } finally {
    loadingAutoStatus.value = false
  }
}

const refreshAll = async () => {
  await Promise.all([loadStats(), loadAutoStatus()])
}

onMounted(refreshAll)

const formatTimestamp = (iso?: string | null) => {
  if (!iso) return 'Never'
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return iso
  }
}

const formatNumber = (v: any): number => {
  if (typeof v === 'number') return v
  if (v && typeof v === 'object' && v.$numberInt) return parseInt(v.$numberInt, 10)
  return typeof v === 'string' ? parseInt(v, 10) || 0 : 0
}

// ------------------------------------------------------------------
// MANUAL EXPORT & UPLOAD RESTORE
// ------------------------------------------------------------------
const handleDownload = async () => {
  downloading.value = true
  try {
    const res = await fetch('/api/admin/backup/export')
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}))
      throw new Error(errJson.message || 'Export failed')
    }

    const blob = await res.blob()
    const contentDisposition = res.headers.get('Content-Disposition')
    let filename = `efe-backup-${new Date().toISOString().slice(0, 10)}.json`
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?([^";]+)"?/)
      if (match && match[1]) filename = match[1]
    }

    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)

    toast.add({
      title: 'Backup Downloaded',
      description: `Complete JSON backup (${filename}) saved successfully.`,
      color: 'success',
      icon: 'i-heroicons-check-circle'
    })

    await refreshAll()
  } catch (err: any) {
    toast.add({
      title: 'Export Failed',
      description: err.message || 'Could not download database backup.',
      color: 'error',
      icon: 'i-heroicons-exclamation-triangle'
    })
  } finally {
    downloading.value = false
  }
}

const triggerFileInput = () => {
  fileInput.value?.click()
}

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  if (!file.name.endsWith('.json')) {
    toast.add({
      title: 'Invalid File',
      description: 'Please select a valid .json backup file.',
      color: 'error',
      icon: 'i-heroicons-exclamation-circle'
    })
    target.value = ''
    return
  }

  selectedFile.value = file

  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(e.target?.result as string)
      const meta = parsed._efe_backup_meta || {}
      const collections = parsed.collections || parsed.data || {}

      const detectedCollections: { name: string; count: number }[] = []
      let totalDocs = 0

      for (const [colName, val] of Object.entries(collections)) {
        if (!colName.startsWith('_') && Array.isArray(val)) {
          detectedCollections.push({ name: colName, count: val.length })
          totalDocs += val.length
        }
      }

      const k = 1024
      const sizes = ['Bytes', 'KB', 'MB', 'GB']
      const i = Math.floor(Math.log(file.size) / Math.log(k))
      const formattedSize = parseFloat((file.size / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]

      filePreview.value = {
        filename: file.name,
        sizeFormatted: formattedSize,
        system: meta.system || 'EFE Backup',
        exportedAt: meta.exportedAt ? new Date(meta.exportedAt).toLocaleString('en-US') : undefined,
        exportedBy: meta.exportedBy,
        totalDocuments: meta.totalDocuments ?? totalDocs,
        collections: detectedCollections
      }
    } catch {
      toast.add({
        title: 'Parsing Error',
        description: 'Unable to parse JSON file structure. Verify the file is not corrupted.',
        color: 'error'
      })
      selectedFile.value = null
      filePreview.value = null
    }
  }
  reader.readAsText(file)
}

const clearSelectedFile = () => {
  selectedFile.value = null
  filePreview.value = null
  if (fileInput.value) fileInput.value.value = ''
}

// ------------------------------------------------------------------
// AUTOMATED BACKUP ACTIONS
// ------------------------------------------------------------------
const handleRunAutoBackup = async (type: 'daily' | 'monthly' | 'both' = 'both') => {
  runningAutoBackup.value = true
  try {
    const res = await $fetch<{ success: boolean; data: any }>('/api/admin/backup/auto-run', {
      method: 'POST',
      body: { type }
    })
    if (res.success && res.data) {
      autoStatus.value = res.data.status
      toast.add({
        title: 'Automated Backup Updated',
        description: 'Latest database snapshot saved successfully.',
        color: 'success',
        icon: 'i-heroicons-check-circle'
      })
      await loadStats()
    }
  } catch (err: any) {
    toast.add({
      title: 'Backup Run Failed',
      description: err.data?.message || err.message || 'Failed to execute automated backup',
      color: 'error',
      icon: 'i-heroicons-exclamation-triangle'
    })
  } finally {
    runningAutoBackup.value = false
  }
}

const downloadAutoFile = async (type: 'daily' | 'monthly', filename?: string) => {
  const url = type === 'daily'
    ? '/api/admin/backup/auto-download?type=daily'
    : `/api/admin/backup/auto-download?type=monthly&filename=${encodeURIComponent(filename || '')}`

  try {
    const res = await fetch(url)
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}))
      throw new Error(errJson.message || 'Download failed')
    }

    const blob = await res.blob()
    const targetFilename = filename || (type === 'daily' ? 'efe-daily-backup.json' : 'efe-monthly-backup.json')
    const blobUrl = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = targetFilename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(blobUrl)

    toast.add({
      title: 'File Downloaded',
      description: `Downloaded ${targetFilename} successfully.`,
      color: 'success',
      icon: 'i-heroicons-check-circle'
    })
  } catch (err: any) {
    toast.add({
      title: 'Download Failed',
      description: err.message || 'Unable to download backup file.',
      color: 'error',
      icon: 'i-heroicons-exclamation-triangle'
    })
  }
}

// ------------------------------------------------------------------
// RESTORE PROMPT & EXECUTION
// ------------------------------------------------------------------
const promptRestoreDaily = () => {
  if (!autoStatus.value?.daily?.exists) return
  restoreTarget.value = {
    type: 'daily',
    title: 'Restore Database from Daily Backup',
    filename: autoStatus.value.daily.filename,
    totalDocuments: autoStatus.value.daily.totalDocuments,
    collectionsCount: autoStatus.value.daily.totalCollections
  }
  showConfirmModal.value = true
}

const promptRestoreMonthly = (item: MonthlyArchive) => {
  restoreTarget.value = {
    type: 'monthly',
    title: `Restore Database from ${item.monthLabel} Archive`,
    filename: item.filename,
    totalDocuments: item.totalDocuments,
    collectionsCount: item.totalCollections
  }
  showConfirmModal.value = true
}

const promptRestoreUpload = () => {
  if (!selectedFile.value || !filePreview.value) return
  restoreTarget.value = {
    type: 'upload',
    title: 'Restore Database from Selected File',
    filename: filePreview.value.filename,
    totalDocuments: filePreview.value.totalDocuments,
    collectionsCount: filePreview.value.collections.length
  }
  showConfirmModal.value = true
}

const executeRestore = async () => {
  if (!restoreTarget.value) return
  restoring.value = true

  try {
    if (restoreTarget.value.type === 'upload') {
      if (!selectedFile.value) return
      const formData = new FormData()
      formData.append('backup', selectedFile.value)

      const res = await $fetch<{ success: boolean; message: string; data: any }>('/api/admin/backup/import', {
        method: 'POST',
        body: formData
      })

      toast.add({
        title: 'Database Restored!',
        description: res.message || 'All collections have been successfully restored.',
        color: 'success',
        icon: 'i-heroicons-check-circle'
      })
      clearSelectedFile()
    } else {
      // Auto restore daily or monthly file from server disk
      const res = await $fetch<{ success: boolean; message: string; data: any }>('/api/admin/backup/auto-restore', {
        method: 'POST',
        body: {
          type: restoreTarget.value.type,
          filename: restoreTarget.value.filename
        }
      })

      toast.add({
        title: 'Database Restored!',
        description: res.message || 'Database successfully restored from automated backup.',
        color: 'success',
        icon: 'i-heroicons-check-circle'
      })
    }

    showConfirmModal.value = false
    restoreTarget.value = null
    await refreshAll()
  } catch (err: any) {
    toast.add({
      title: 'Restore Failed',
      description: err.data?.message || err.message || 'Could not restore database.',
      color: 'error',
      icon: 'i-heroicons-exclamation-triangle'
    })
  } finally {
    restoring.value = false
  }
}
</script>

<template>
  <div class="p-6 sm:p-8 lg:p-10 pb-16 max-w-7xl mx-auto space-y-10">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <UIcon name="i-heroicons-circle-stack" class="w-7 h-7 text-emerald-400" />
          Database Backup & Restore
        </h1>
        <p class="text-sm text-slate-400 mt-1">
          Automated rolling backups, monthly historical archives, and manual disaster recovery tools.
        </p>
      </div>

      <div class="flex items-center gap-3">
        <UButton
          icon="i-heroicons-arrow-path"
          color="neutral"
          variant="ghost"
          :loading="loadingStats || loadingAutoStatus"
          @click="refreshAll"
        >
          Refresh All Stats
        </UButton>
      </div>
    </div>

    <!-- Live Database Status Banner -->
    <div
      class="rounded-2xl p-6 lg:p-7 border transition-all shadow-xl"
      style="background: #161b26; border-color: rgba(255, 255, 255, 0.08);"
    >
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div class="flex items-center gap-4">
          <div
            class="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg"
            style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(6, 95, 70, 0.3)); border: 1px solid rgba(16, 185, 129, 0.3);"
          >
            <UIcon name="i-heroicons-server-stack" class="w-8 h-8 text-emerald-400" />
          </div>
          <div>
            <div class="flex items-center gap-2">
              <span class="text-xs uppercase font-bold tracking-wider text-emerald-400">MongoDB Database</span>
              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Online
              </span>
            </div>
            <h2 class="text-xl font-bold text-white mt-0.5">
              {{ stats?.databaseName || 'efe_taxi_dispatch' }}
            </h2>
            <p class="text-xs text-slate-400 mt-0.5">
              All collections, driver photos (GridFS), and biometric templates are automatically managed.
            </p>
          </div>
        </div>

        <div class="flex items-center gap-8 border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-8 border-white/10">
          <div>
            <div class="text-xs text-slate-400">Total Collections</div>
            <div class="text-2xl font-black text-white mt-0.5">
              <span v-if="loadingStats" class="animate-pulse">--</span>
              <span v-else>{{ stats?.totalCollections ?? 0 }}</span>
            </div>
          </div>
          <div>
            <div class="text-xs text-slate-400">Total Documents</div>
            <div class="text-2xl font-black text-emerald-400 mt-0.5">
              <span v-if="loadingStats" class="animate-pulse">--</span>
              <span v-else>{{ stats?.totalDocuments ?? 0 }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Detected Collections Badges -->
      <div class="mt-6 pt-5 border-t border-white/5">
        <div class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Detected Collections in Database:
        </div>
        <div v-if="loadingStats" class="flex flex-wrap gap-2.5">
          <div v-for="i in 8" :key="i" class="h-7 w-24 rounded-lg bg-white/5 animate-pulse" />
        </div>
        <div v-else-if="stats?.collections?.length" class="flex flex-wrap gap-2.5">
          <div
            v-for="col in stats.collections"
            :key="col.name"
            class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border"
            style="background: rgba(255, 255, 255, 0.03); border-color: rgba(255, 255, 255, 0.08);"
          >
            <UIcon name="i-heroicons-folder" class="w-3.5 h-3.5 text-slate-400" />
            <span class="text-slate-200 font-mono">{{ col.name }}</span>
            <span class="px-1.5 py-0.2 rounded text-[10px] font-bold bg-white/10 text-emerald-300">
              {{ col.count }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- ============================================== -->
    <!-- SECTION 1: AUTOMATED BACKUPS (Daily & Monthly) -->
    <!-- ============================================== -->
    <div class="space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div class="flex items-center gap-2.5">
            <h2 class="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <UIcon name="i-heroicons-clock" class="w-6 h-6 text-emerald-400" />
              Automated Background Backups
            </h2>
            <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Auto Schedule & Startup Catch-Up Active
            </span>
          </div>
          <p class="text-xs text-slate-400 mt-1">
            Runs silently in the background. If the PC is turned off during a scheduled run, it automatically catches up on boot.
          </p>
        </div>

        <button
          type="button"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 border border-white/10 hover:border-emerald-500/40 shadow-sm transition-all duration-200 cursor-pointer disabled:opacity-50"
          :disabled="runningAutoBackup"
          @click="handleRunAutoBackup('both')"
        >
          <UIcon
            name="i-heroicons-arrow-path"
            class="w-4 h-4 text-emerald-400"
            :class="{ 'animate-spin': runningAutoBackup }"
          />
          <span>{{ runningAutoBackup ? 'Running Backup...' : 'Run Automated Backup Now' }}</span>
        </button>
      </div>

      <!-- Automated Cards Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10">
        <!-- 1. Daily Rolling Card -->
        <div
          class="rounded-2xl p-6 lg:p-8 border flex flex-col justify-between shadow-xl"
          style="background: #161b26; border-color: rgba(255, 255, 255, 0.08);"
        >
          <div>
            <div class="flex items-center justify-between gap-3 mb-4">
              <div class="flex items-center gap-3">
                <div
                  class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style="background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3);"
                >
                  <UIcon name="i-heroicons-calendar-days" class="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 class="text-lg font-bold text-white">Daily Rolling Backup</h3>
                  <p class="text-xs text-slate-400">Overwrites every 24 hours into 1 single file</p>
                </div>
              </div>
              <span class="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                1 File Storage
              </span>
            </div>

            <p class="text-sm text-slate-300 leading-relaxed mb-4">
              Every 24 hours, the system creates or updates <strong>`efe-daily-backup.json`</strong>. Previous data is safely overwritten so you only ever store <strong>one file</strong>.
            </p>

            <!-- Daily Status Box -->
            <div
              class="rounded-xl p-4 border mb-6 space-y-3"
              style="background: rgba(16, 185, 129, 0.04); border-color: rgba(16, 185, 129, 0.2);"
            >
              <div class="flex items-center justify-between text-xs">
                <span class="text-slate-400">Target File:</span>
                <span class="font-mono text-emerald-300 font-semibold">efe-daily-backup.json</span>
              </div>
              <div class="flex items-center justify-between text-xs">
                <span class="text-slate-400">Last Overwritten:</span>
                <span class="text-white font-medium">
                  {{ formatTimestamp(autoStatus?.daily?.lastModified) }}
                </span>
              </div>
              <div class="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-white/5">
                <div>
                  <span class="text-slate-400">Records Saved:</span>
                  <span class="ml-1 font-bold text-emerald-400">
                    {{ formatNumber(autoStatus?.daily?.totalDocuments) }}
                  </span>
                </div>
                <div>
                  <span class="text-slate-400">File Size:</span>
                  <span class="ml-1 font-bold text-slate-200">
                    {{ autoStatus?.daily?.sizeFormatted || '0 Bytes' }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div class="pt-6 border-t border-white/5 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              class="flex-1 group py-2.5 px-4 rounded-xl font-bold text-xs text-white flex items-center justify-center gap-2 border border-emerald-400/30 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:via-emerald-400 hover:to-teal-500 shadow-md shadow-emerald-950/50 hover:shadow-lg hover:shadow-emerald-500/25 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              :disabled="!autoStatus?.daily?.exists"
              @click="downloadAutoFile('daily')"
            >
              <UIcon name="i-heroicons-arrow-down-tray" class="w-4 h-4 transition-transform group-hover:translate-y-0.5" />
              <span>Download Daily Backup</span>
            </button>

            <button
              type="button"
              class="py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all duration-200"
              :class="[
                !autoStatus?.daily?.exists || restoring
                  ? 'opacity-40 cursor-not-allowed bg-slate-800/60 border-white/5 text-slate-400'
                  : 'text-amber-300 border-amber-400/30 bg-amber-500/10 hover:bg-amber-500/20 hover:border-amber-400/50 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer'
              ]"
              :disabled="!autoStatus?.daily?.exists || restoring"
              @click="promptRestoreDaily"
            >
              <UIcon name="i-heroicons-arrow-path" class="w-4 h-4" />
              <span>Restore from Daily</span>
            </button>
          </div>
        </div>

        <!-- 2. Monthly Archives Card -->
        <div
          class="rounded-2xl p-6 lg:p-8 border flex flex-col justify-between shadow-xl"
          style="background: #161b26; border-color: rgba(255, 255, 255, 0.08);"
        >
          <div>
            <div class="flex items-center justify-between gap-3 mb-4">
              <div class="flex items-center gap-3">
                <div
                  class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style="background: rgba(59, 130, 246, 0.15); border: 1px solid rgba(59, 130, 246, 0.3);"
                >
                  <UIcon name="i-heroicons-archive-box" class="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 class="text-lg font-bold text-white">Monthly Historical Archives</h3>
                  <p class="text-xs text-slate-400">Creates a new archive file on the 1st of every month</p>
                </div>
              </div>
              <span class="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                1 File / Month
              </span>
            </div>

            <p class="text-sm text-slate-300 leading-relaxed mb-4">
              Every month, a distinct historical archive is preserved permanently (e.g. <strong>`efe-monthly-2026-09.json`</strong>) for audits and tax records.
            </p>

            <!-- Monthly Archives List Container -->
            <div class="mb-4">
              <div v-if="loadingAutoStatus" class="space-y-2">
                <div v-for="i in 2" :key="i" class="h-14 rounded-xl bg-white/5 animate-pulse" />
              </div>

              <div
                v-else-if="autoStatus?.monthly?.length"
                class="space-y-2.5 max-h-48 overflow-y-auto pr-1"
              >
                <div
                  v-for="item in autoStatus.monthly"
                  :key="item.filename"
                  class="rounded-xl p-3 border flex items-center justify-between gap-3"
                  style="background: rgba(255, 255, 255, 0.02); border-color: rgba(255, 255, 255, 0.07);"
                >
                  <div class="overflow-hidden">
                    <div class="flex items-center gap-2">
                      <span class="text-xs font-bold text-white">{{ item.monthLabel }}</span>
                      <span class="text-[10px] font-mono text-slate-400">({{ item.sizeFormatted }})</span>
                    </div>
                    <div class="text-[11px] text-slate-400 mt-0.5">
                      {{ formatNumber(item.totalDocuments) }} records &bull; {{ formatTimestamp(item.createdAt) }}
                    </div>
                  </div>

                  <div class="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      class="px-2.5 py-1 rounded-lg text-xs font-medium text-emerald-300 hover:text-white bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition-colors cursor-pointer"
                      title="Download this monthly backup"
                      @click="downloadAutoFile('monthly', item.filename)"
                    >
                      <UIcon name="i-heroicons-arrow-down-tray" class="w-3.5 h-3.5 inline mr-1" />
                      Download
                    </button>
                    <button
                      type="button"
                      class="px-2.5 py-1 rounded-lg text-xs font-medium text-amber-300 hover:text-white bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-colors cursor-pointer disabled:opacity-40"
                      :disabled="restoring"
                      title="Restore database to this month's state"
                      @click="promptRestoreMonthly(item)"
                    >
                      <UIcon name="i-heroicons-arrow-path" class="w-3.5 h-3.5 inline mr-1" />
                      Restore
                    </button>
                  </div>
                </div>
              </div>

              <!-- Empty Monthly State -->
              <div
                v-else
                class="rounded-xl p-5 border text-center space-y-2"
                style="background: rgba(255, 255, 255, 0.02); border-color: rgba(255, 255, 255, 0.06);"
              >
                <UIcon name="i-heroicons-folder-open" class="w-7 h-7 text-slate-500 mx-auto" />
                <div class="text-xs font-medium text-slate-300">No monthly archives recorded yet</div>
                <p class="text-[11px] text-slate-400 max-w-xs mx-auto">
                  Archives trigger automatically on the 1st of every month or can be generated now.
                </p>
              </div>
            </div>
          </div>

          <div class="pt-6 border-t border-white/5">
            <button
              type="button"
              class="w-full py-2.5 px-4 rounded-xl font-bold text-xs text-white flex items-center justify-center gap-2 border border-blue-400/30 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-md shadow-blue-950/50 hover:shadow-lg hover:shadow-blue-500/25 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer disabled:opacity-50"
              :disabled="runningAutoBackup"
              @click="handleRunAutoBackup('monthly')"
            >
              <UIcon name="i-heroicons-plus-circle" class="w-4 h-4" />
              <span>Create / Update Current Month's Archive</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ============================================== -->
    <!-- SECTION 2: MANUAL BACKUP & FILE RESTORE -->
    <!-- ============================================== -->
    <div class="pt-6 border-t border-white/5 space-y-6">
      <div>
        <h2 class="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <UIcon name="i-heroicons-arrow-down-tray" class="w-6 h-6 text-slate-400" />
          Manual Backup & File Restore
        </h2>
        <p class="text-xs text-slate-400 mt-1">
          Download an immediate JSON snapshot to your computer or upload an existing backup file to restore.
        </p>
      </div>

      <!-- Action Cards Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10">
        <!-- 1. BACKUP / EXPORT CARD -->
        <div
          class="rounded-2xl p-6 lg:p-8 border flex flex-col justify-between shadow-xl"
          style="background: #161b26; border-color: rgba(255, 255, 255, 0.08);"
        >
          <div>
            <div class="flex items-center gap-3 mb-4">
              <div
                class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style="background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3);"
              >
                <UIcon name="i-heroicons-arrow-down-tray" class="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h3 class="text-lg font-bold text-white">Export JSON Backup</h3>
                <p class="text-xs text-slate-400">Download complete system database snapshot</p>
              </div>
            </div>

            <p class="text-sm text-slate-300 leading-relaxed mb-4">
              Exports all <strong>11 database collections</strong> into a single, structured <strong>`.json`</strong> file using MongoDB Extended JSON format (EJSON).
            </p>

            <div class="space-y-2 mb-6">
              <div class="flex items-start gap-2 text-xs text-slate-400">
                <UIcon name="i-heroicons-check" class="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Preserves driver photos (GridFS binary chunks), biometric templates, and users losslessly.</span>
              </div>
              <div class="flex items-start gap-2 text-xs text-slate-400">
                <UIcon name="i-heroicons-check" class="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Safe to download at any time while the server is live. Does not disrupt active shifts.</span>
              </div>
              <div class="flex items-start gap-2 text-xs text-slate-400">
                <UIcon name="i-heroicons-check" class="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Can be stored on your USB stick or external drive for safekeeping or server migration.</span>
              </div>
            </div>
          </div>

          <div class="pt-6 border-t border-white/5">
            <button
              type="button"
              class="w-full group py-3 px-5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2.5 border border-emerald-400/30 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:via-emerald-400 hover:to-teal-500 shadow-lg shadow-emerald-950/50 hover:shadow-xl hover:shadow-emerald-500/30 hover:-translate-y-0.5 hover:scale-[1.01] active:translate-y-0 active:scale-[0.99] transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
              :disabled="downloading"
              @click="handleDownload"
            >
              <UIcon
                :name="downloading ? 'i-heroicons-arrow-path' : 'i-heroicons-arrow-down-tray'"
                class="w-5 h-5 transition-transform duration-200"
                :class="{ 'animate-spin': downloading, 'group-hover:translate-y-0.5': !downloading }"
              />
              <span>{{ downloading ? 'Exporting Database...' : 'Download Complete JSON Backup' }}</span>
            </button>
          </div>
        </div>

        <!-- 2. RESTORE / IMPORT CARD -->
        <div
          class="rounded-2xl p-6 lg:p-8 border flex flex-col justify-between shadow-xl"
          style="background: #161b26; border-color: rgba(255, 255, 255, 0.08);"
        >
          <div>
            <div class="flex items-center gap-3 mb-4">
              <div
                class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style="background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.3);"
              >
                <UIcon name="i-heroicons-arrow-up-tray" class="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 class="text-lg font-bold text-white">Restore from Backup File</h3>
                <p class="text-xs text-slate-400">Import collections from an existing JSON backup</p>
              </div>
            </div>

            <p class="text-sm text-slate-300 leading-relaxed mb-4">
              Upload an <strong>`efe-backup-*.json`</strong> file to restore your database to an exact historical state or populate a new server PC.
            </p>

            <!-- Hidden File Input -->
            <input
              ref="fileInput"
              type="file"
              accept=".json,application/json"
              class="hidden"
              @change="handleFileSelect"
            />

            <!-- File Upload Zone -->
            <div
              v-if="!filePreview"
              class="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer hover:border-amber-400/50 transition-colors mb-4"
              style="border-color: rgba(255, 255, 255, 0.12); background: rgba(255, 255, 255, 0.01);"
              @click="triggerFileInput"
            >
              <UIcon name="i-heroicons-document-arrow-up" class="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <div class="text-sm font-semibold text-white">Click to Select Backup File</div>
              <div class="text-xs text-slate-400 mt-1">Supports .json files generated by EFE Dispatch Backup</div>
            </div>

            <!-- File Selected Preview Card -->
            <div
              v-else
              class="rounded-xl p-4 border mb-4 space-y-3"
              style="background: rgba(245, 158, 11, 0.05); border-color: rgba(245, 158, 11, 0.3);"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2 overflow-hidden">
                  <UIcon name="i-heroicons-document-check" class="w-5 h-5 text-amber-400 shrink-0" />
                  <span class="text-sm font-bold text-white truncate">{{ filePreview.filename }}</span>
                  <span class="text-xs text-slate-400">({{ filePreview.sizeFormatted }})</span>
                </div>
                <UButton
                  icon="i-heroicons-x-mark"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  @click="clearSelectedFile"
                />
              </div>

              <div class="grid grid-cols-2 gap-2 text-xs text-slate-300 pt-2 border-t border-white/5">
                <div>
                  <span class="text-slate-400">Exported:</span>
                  <span class="ml-1 font-medium text-white">{{ filePreview.exportedAt || 'Unknown' }}</span>
                </div>
                <div>
                  <span class="text-slate-400">Total Records:</span>
                  <span class="ml-1 font-bold text-emerald-400">{{ filePreview.totalDocuments }}</span>
                </div>
              </div>

              <div class="text-xs text-slate-400">
                <span class="font-semibold text-slate-300">Collections found: </span>
                <span class="font-mono text-amber-300">
                  {{ filePreview.collections.map(c => `${c.name} (${c.count})`).join(', ') }}
                </span>
              </div>
            </div>

            <div
              class="rounded-xl p-3 text-xs leading-relaxed flex items-start gap-2.5 mb-6"
              style="background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.2); color: #fca5a5;"
            >
              <UIcon name="i-heroicons-exclamation-triangle" class="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>
                <strong>Warning:</strong> Restoring will overwrite existing database records in matching collections. Use caution when running in production.
              </span>
            </div>
          </div>

          <div class="pt-6 border-t border-white/5">
            <button
              type="button"
              class="w-full group py-3 px-5 rounded-xl font-bold text-sm flex items-center justify-center gap-2.5 transition-all duration-200 border"
              :class="[
                !selectedFile || restoring
                  ? 'opacity-40 cursor-not-allowed bg-slate-800/60 border-white/5 text-slate-400'
                  : 'text-white border-amber-400/30 bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-600 hover:from-amber-500 hover:via-amber-400 hover:to-yellow-500 shadow-lg shadow-amber-950/50 hover:shadow-xl hover:shadow-amber-500/30 hover:-translate-y-0.5 hover:scale-[1.01] active:translate-y-0 active:scale-[0.99] cursor-pointer'
              ]"
              :disabled="!selectedFile || restoring"
              @click="promptRestoreUpload"
            >
              <UIcon
                name="i-heroicons-arrow-path"
                class="w-5 h-5 transition-transform duration-200"
                :class="{ 'animate-spin': restoring, 'group-hover:rotate-45': !restoring && selectedFile }"
              />
              <span>{{ restoring ? 'Restoring Database...' : 'Restore Database from Selected File' }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Confirmation Modal for Restore (Supports Upload, Daily, or Monthly restore) -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showConfirmModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="!restoring && (showConfirmModal = false)" />
          <div class="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-full flex items-center justify-center shrink-0 bg-red-500/20 text-red-400 border border-red-500/30">
                <UIcon name="i-heroicons-exclamation-triangle" class="w-6 h-6" />
              </div>
              <div>
                <h3 class="text-lg font-bold text-white">{{ restoreTarget?.title || 'Confirm Database Restore' }}</h3>
                <p class="text-xs text-slate-400">This action will replace existing database records</p>
              </div>
            </div>

            <p class="text-sm text-slate-300 leading-relaxed">
              You are about to restore <strong>{{ formatNumber(restoreTarget?.totalDocuments) }} documents</strong> from:
              <br />
              <span class="font-mono text-amber-300 font-semibold text-xs break-all">{{ restoreTarget?.filename }}</span>
            </p>

            <div class="rounded-xl p-3 text-xs leading-relaxed text-amber-300 bg-amber-500/10 border border-amber-500/20">
              Any current records in matching collections will be overwritten with data from this backup snapshot.
            </div>

            <div class="flex justify-end gap-3 pt-2">
              <button
                type="button"
                class="px-4 py-2 text-sm font-medium rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50 cursor-pointer"
                :disabled="restoring"
                @click="showConfirmModal = false"
              >
                Cancel
              </button>
              <button
                type="button"
                class="px-5 py-2 text-sm font-bold rounded-xl text-white flex items-center gap-2 border border-red-400/30 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 shadow-lg shadow-red-950/40 hover:shadow-xl hover:shadow-red-500/30 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                :disabled="restoring"
                @click="executeRestore"
              >
                <UIcon v-if="restoring" name="i-heroicons-arrow-path" class="w-4 h-4 animate-spin" />
                <span>{{ restoring ? 'Restoring Database...' : 'Yes, Overwrite & Restore' }}</span>
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
