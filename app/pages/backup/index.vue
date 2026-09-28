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

const stats = ref<BackupStats | null>(null)
const loadingStats = ref(true)
const downloading = ref(false)
const restoring = ref(false)

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

const showConfirmModal = ref(false)
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

onMounted(loadStats)

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

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
      color: 'green',
      icon: 'i-heroicons-check-circle'
    })

    // Refresh stats to include the audit log record
    await loadStats()
  } catch (err: any) {
    toast.add({
      title: 'Export Failed',
      description: err.message || 'Could not download database backup.',
      color: 'red',
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
      color: 'red',
      icon: 'i-heroicons-exclamation-circle'
    })
    target.value = ''
    return
  }

  selectedFile.value = file

  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const text = e.target?.result as string
      const parsed = JSON.parse(text)

      let collectionList: { name: string; count: number }[] = []
      let meta = parsed._efe_backup_meta || {}

      if (parsed.collections && typeof parsed.collections === 'object') {
        collectionList = Object.entries(parsed.collections).map(([name, docs]) => ({
          name,
          count: Array.isArray(docs) ? docs.length : 0
        }))
      } else if (parsed.data && typeof parsed.data === 'object') {
        collectionList = Object.entries(parsed.data).map(([name, docs]) => ({
          name,
          count: Array.isArray(docs) ? docs.length : 0
        }))
      } else {
        collectionList = Object.entries(parsed)
          .filter(([key, val]) => !key.startsWith('_') && key !== 'meta' && Array.isArray(val))
          .map(([name, docs]) => ({
            name,
            count: (docs as any[]).length
          }))
      }

      const totalDocs = collectionList.reduce((acc, c) => acc + c.count, 0)

      filePreview.value = {
        filename: file.name,
        sizeFormatted: formatFileSize(file.size),
        system: meta.system || 'EFE Taxi Dispatch Backup',
        exportedAt: meta.exportedAt ? new Date(meta.exportedAt).toLocaleString() : undefined,
        exportedBy: meta.exportedBy,
        totalDocuments: totalDocs,
        collections: collectionList
      }
    } catch (parseErr: any) {
      toast.add({
        title: 'Parsing Error',
        description: 'Unable to parse JSON file structure. Verify the file is not corrupted.',
        color: 'red'
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

const executeRestore = async () => {
  if (!selectedFile.value) return
  restoring.value = true
  showConfirmModal.value = false

  try {
    const formData = new FormData()
    formData.append('backup', selectedFile.value)

    const res = await $fetch<{ success: boolean; message: string; data: any }>('/api/admin/backup/import', {
      method: 'POST',
      body: formData
    })

    toast.add({
      title: 'Database Restored!',
      description: res.message || 'All collections have been successfully restored.',
      color: 'green',
      icon: 'i-heroicons-check-circle'
    })

    clearSelectedFile()
    await loadStats()
  } catch (err: any) {
    toast.add({
      title: 'Restore Failed',
      description: err.data?.message || err.message || 'Could not restore database.',
      color: 'red',
      icon: 'i-heroicons-exclamation-triangle'
    })
  } finally {
    restoring.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <UIcon name="i-heroicons-circle-stack" class="w-7 h-7 text-emerald-400" />
          Database Backup & Restore
        </h1>
        <p class="text-sm text-slate-400 mt-1">
          Export your entire MongoDB database into a single JSON file or restore from a previous backup.
        </p>
      </div>

      <div class="flex items-center gap-3">
        <UButton
          icon="i-heroicons-arrow-path"
          color="gray"
          variant="ghost"
          :loading="loadingStats"
          @click="loadStats"
        >
          Refresh Stats
        </UButton>
      </div>
    </div>

    <!-- Live Database Status Banner -->
    <div
      class="rounded-2xl p-6 border transition-all"
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
        <div v-if="loadingStats" class="flex flex-wrap gap-2">
          <div v-for="i in 8" :key="i" class="h-7 w-24 rounded-lg bg-white/5 animate-pulse" />
        </div>
        <div v-else-if="stats?.collections?.length" class="flex flex-wrap gap-2">
          <div
            v-for="col in stats.collections"
            :key="col.name"
            class="inline-flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-medium border"
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

    <!-- Action Cards Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- 1. BACKUP / EXPORT CARD -->
      <div
        class="rounded-2xl p-6 border flex flex-col justify-between"
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

        <div class="pt-4 border-t border-white/5">
          <UButton
            size="lg"
            color="emerald"
            class="w-full justify-center font-bold shadow-lg"
            :loading="downloading"
            @click="handleDownload"
          >
            <UIcon name="i-heroicons-arrow-down-tray" class="w-5 h-5 mr-2" />
            Download Complete JSON Backup
          </UButton>
        </div>
      </div>

      <!-- 2. RESTORE / IMPORT CARD -->
      <div
        class="rounded-2xl p-6 border flex flex-col justify-between"
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
              <h3 class="text-lg font-bold text-white">Restore from Backup</h3>
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
                color="gray"
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

        <div class="pt-4 border-t border-white/5">
          <UButton
            size="lg"
            color="amber"
            class="w-full justify-center font-bold shadow-lg"
            :disabled="!selectedFile"
            :loading="restoring"
            @click="showConfirmModal = true"
          >
            <UIcon name="i-heroicons-arrow-path" class="w-5 h-5 mr-2" />
            Restore Database from Selected File
          </UButton>
        </div>
      </div>
    </div>

    <!-- Confirmation Modal for Restore -->
    <UModal v-model="showConfirmModal">
      <div class="p-6 space-y-4" style="background: #161b26;">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-full flex items-center justify-center shrink-0 bg-red-500/20 text-red-400 border border-red-500/30">
            <UIcon name="i-heroicons-exclamation-triangle" class="w-6 h-6" />
          </div>
          <div>
            <h3 class="text-lg font-bold text-white">Confirm Database Restore</h3>
            <p class="text-xs text-slate-400">This action will update existing database records</p>
          </div>
        </div>

        <p class="text-sm text-slate-300 leading-relaxed">
          You are about to restore <strong>{{ filePreview?.totalDocuments }} documents</strong> across
          <strong>{{ filePreview?.collections.length }} collections</strong> from file:
          <br />
          <span class="font-mono text-amber-300 font-semibold text-xs">{{ filePreview?.filename }}</span>
        </p>

        <div
          class="rounded-xl p-3 text-xs leading-relaxed text-amber-300 bg-amber-500/10 border border-amber-500/20"
        >
          Any current records in the matching collections will be replaced with the data from the backup file.
        </div>

        <div class="flex justify-end gap-3 pt-3">
          <UButton
            color="gray"
            variant="ghost"
            @click="showConfirmModal = false"
          >
            Cancel
          </UButton>
          <UButton
            color="red"
            class="font-bold"
            :loading="restoring"
            @click="executeRestore"
          >
            Yes, Overwrite & Restore Database
          </UButton>
        </div>
      </div>
    </UModal>
  </div>
</template>
