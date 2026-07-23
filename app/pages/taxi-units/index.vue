<script setup lang="ts">
import { useTaxiUnitStore } from '~/stores/taxiUnits'
import { useAuthStore } from '~/stores/auth'
import type { TaxiUnit, CreateTaxiUnitPayload } from '~/types'

definePageMeta({ layout: 'default', middleware: 'auth' })
useHead({ title: 'Taxi Fleet — EFE Taxi Dispatch System' })

const authStore = useAuthStore()
const taxiStore = useTaxiUnitStore()
const toast = useToast()

const search = ref('')
const statusFilter = ref('')
const page = ref(1)
const showModal = ref(false)
const showDeleteModal = ref(false)
const editingUnit = ref<TaxiUnit | null>(null)
const deletingUnit = ref<TaxiUnit | null>(null)
const formLoading = ref(false)

const form = reactive<CreateTaxiUnitPayload>({
  taxiNumber: '', plateNumber: '', brand: '', model: '',
  year: new Date().getFullYear(), color: '', status: 'Available'
})

const resetForm = () => {
  Object.assign(form, { taxiNumber: '', plateNumber: '', brand: '', model: '', year: new Date().getFullYear(), color: '', status: 'Available' })
  editingUnit.value = null
}

const loadUnits = () => {
  const params: Record<string, string | number> = { page: page.value, limit: 10 }
  if (search.value) params.search = search.value
  if (statusFilter.value) params.status = statusFilter.value
  taxiStore.fetchAll(params)
}

onMounted(loadUnits)
watch([search, statusFilter], useDebounceFn(() => { page.value = 1; loadUnits() }, 400))
watch(page, loadUnits)

const openCreate = () => { resetForm(); showModal.value = true }
const openEdit = (unit: TaxiUnit) => {
  editingUnit.value = unit
  Object.assign(form, { ...unit })
  showModal.value = true
}

const handleSubmit = async () => {
  formLoading.value = true
  try {
    if (editingUnit.value) {
      await taxiStore.update(editingUnit.value._id, form)
      toast.add({ title: 'Taxi unit updated', color: 'success' })
    } else {
      await taxiStore.create(form)
      toast.add({ title: 'Taxi unit added', color: 'success' })
    }
    showModal.value = false; resetForm(); loadUnits()
  } catch (err: unknown) {
    toast.add({ title: 'Error', description: (err as { data?: { message?: string } })?.data?.message || 'Failed', color: 'error' })
  } finally { formLoading.value = false }
}

const confirmDelete = (unit: TaxiUnit) => { deletingUnit.value = unit; showDeleteModal.value = true }
const handleDelete = async () => {
  if (!deletingUnit.value) return
  try {
    await taxiStore.remove(deletingUnit.value._id)
    toast.add({ title: 'Taxi unit removed', color: 'success' })
    showDeleteModal.value = false; loadUnits()
  } catch { toast.add({ title: 'Delete failed', color: 'error' }) }
}

const statusClass = (status: string) => {
  if (status === 'Available') return 'badge-available'
  if (status === 'On Trip') return 'badge-on-trip'
  return 'badge-maintenance'
}
</script>

<template>
  <NuxtLayout name="default">
    <div class="p-6 space-y-5 animate-fadeIn">
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-white">Taxi Fleet</h1>
          <p class="text-sm text-slate-400 mt-0.5">Manage all registered taxi units</p>
        </div>
        <button v-if="authStore.canManageTaxis" class="btn-primary" @click="openCreate">
          <UIcon name="i-heroicons-plus" class="w-4 h-4" /> Add Taxi Unit
        </button>
      </div>

      <!-- Filters -->
      <div class="glass-card p-4 flex flex-col sm:flex-row gap-3">
        <div class="relative flex-1">
          <UIcon name="i-heroicons-magnifying-glass" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input v-model="search" type="text" class="form-input pl-9" placeholder="Search by number, plate, brand..." />
        </div>
        <select v-model="statusFilter" class="form-input w-full sm:w-48">
          <option value="">All Status</option>
          <option value="Available">Available</option>
          <option value="On Trip">On Trip</option>
          <option value="Maintenance">Maintenance</option>
        </select>
      </div>

      <!-- Grid / Table -->
      <div class="glass-card overflow-hidden">
        <div v-if="taxiStore.loading" class="p-10 text-center">
          <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 text-green-500 animate-spin mx-auto" />
        </div>
        <div v-else-if="!taxiStore.taxiUnits.length" class="p-16 text-center">
          <UIcon name="i-heroicons-truck" class="w-12 h-12 text-slate-700 mx-auto mb-3" />
          <p class="text-slate-400 font-medium">No taxi units found</p>
        </div>
        <div v-else>
          <div class="overflow-x-auto">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Taxi #</th>
                  <th>Plate No.</th>
                  <th>Vehicle</th>
                  <th>Year</th>
                  <th>Color</th>
                  <th>Status</th>
                  <th v-if="authStore.canManageTaxis">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="unit in taxiStore.taxiUnits" :key="unit._id">
                  <td>
                    <div class="flex items-center gap-2.5">
                      <div class="w-8 h-8 rounded-lg bg-yellow-900/20 border border-yellow-500/20 flex items-center justify-center">
                        <UIcon name="i-heroicons-truck" class="w-4 h-4 text-yellow-400" />
                      </div>
                      <span class="font-bold text-white">{{ unit.taxiNumber }}</span>
                    </div>
                  </td>
                  <td><span class="font-mono text-sm text-slate-300 uppercase">{{ unit.plateNumber }}</span></td>
                  <td>
                    <p class="text-white font-medium">{{ unit.brand }} {{ unit.model }}</p>
                  </td>
                  <td class="text-slate-400">{{ unit.year }}</td>
                  <td>
                    <div class="flex items-center gap-2">
                      <div class="w-3 h-3 rounded-full border border-white/20" style="background: #f9a825;" />
                      <span class="text-slate-300 text-sm">{{ unit.color }}</span>
                    </div>
                  </td>
                  <td>
                    <span :class="['px-2 py-0.5 rounded-full text-xs font-medium', statusClass(unit.status)]">{{ unit.status }}</span>
                  </td>
                  <td v-if="authStore.canManageTaxis">
                    <div class="flex items-center gap-2">
                      <button class="p-1.5 rounded-lg hover:bg-white/5 transition-colors" @click="openEdit(unit)">
                        <UIcon name="i-heroicons-pencil-square" class="w-4 h-4 text-blue-400" />
                      </button>
                      <button class="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors" @click="confirmDelete(unit)">
                        <UIcon name="i-heroicons-trash" class="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination -->
          <div v-if="taxiStore.pagination && taxiStore.pagination.pages > 1" class="flex items-center justify-between px-5 py-4 border-t" style="border-color: rgba(255,255,255,0.06);">
            <p class="text-xs text-slate-500">{{ taxiStore.pagination.total }} total units</p>
            <div class="flex gap-2">
              <button :disabled="page <= 1" class="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40" @click="page--">
                <UIcon name="i-heroicons-chevron-left" class="w-4 h-4" />
              </button>
              <button :disabled="page >= taxiStore.pagination.pages" class="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40" @click="page++">
                <UIcon name="i-heroicons-chevron-right" class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Taxi Form Modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="showModal = false" />
          <div class="relative w-full max-w-lg glass-card p-6 animate-fadeIn">
            <div class="flex items-center justify-between mb-6">
              <h2 class="text-lg font-bold text-white">{{ editingUnit ? 'Edit Taxi Unit' : 'Add New Taxi Unit' }}</h2>
              <button class="p-2 hover:bg-white/5 rounded-lg transition-colors" @click="showModal = false">
                <UIcon name="i-heroicons-x-mark" class="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <form @submit.prevent="handleSubmit" class="space-y-4">
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="form-label">Taxi Number *</label>
                  <input v-model="form.taxiNumber" type="text" class="form-input" required placeholder="TX-001" />
                </div>
                <div>
                  <label class="form-label">Plate Number *</label>
                  <input v-model="form.plateNumber" type="text" class="form-input" required placeholder="ABC 1234" />
                </div>
                <div>
                  <label class="form-label">Brand *</label>
                  <input v-model="form.brand" type="text" class="form-input" required placeholder="Toyota" />
                </div>
                <div>
                  <label class="form-label">Model *</label>
                  <input v-model="form.model" type="text" class="form-input" required placeholder="Vios" />
                </div>
                <div>
                  <label class="form-label">Year *</label>
                  <input v-model.number="form.year" type="number" class="form-input" required :min="1990" :max="new Date().getFullYear() + 1" />
                </div>
                <div>
                  <label class="form-label">Color *</label>
                  <input v-model="form.color" type="text" class="form-input" required placeholder="Yellow" />
                </div>
                <div class="col-span-2">
                  <label class="form-label">Status</label>
                  <select v-model="form.status" class="form-input">
                    <option value="Available">Available</option>
                    <option value="On Trip">On Trip</option>
                    <option value="Maintenance">Maintenance</option>
                  </select>
                </div>
              </div>
              <div class="flex gap-3 pt-2">
                <button type="button" class="btn-secondary flex-1" @click="showModal = false">Cancel</button>
                <button type="submit" class="btn-primary flex-1" :disabled="formLoading">
                  <UIcon v-if="formLoading" name="i-heroicons-arrow-path" class="w-4 h-4 animate-spin" />
                  {{ formLoading ? 'Saving...' : (editingUnit ? 'Update' : 'Add Unit') }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Delete Confirm -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showDeleteModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="showDeleteModal = false" />
          <div class="relative glass-card p-6 max-w-sm w-full text-center animate-fadeIn">
            <div class="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <UIcon name="i-heroicons-trash" class="w-6 h-6 text-red-400" />
            </div>
            <h3 class="text-lg font-bold text-white mb-2">Remove Taxi Unit</h3>
            <p class="text-slate-400 text-sm mb-5">Remove <span class="text-white font-medium">{{ deletingUnit?.taxiNumber }} ({{ deletingUnit?.plateNumber }})</span>?</p>
            <div class="flex gap-3">
              <button class="btn-secondary flex-1" @click="showDeleteModal = false">Cancel</button>
              <button class="btn-primary flex-1" style="background: linear-gradient(135deg, #dc2626, #991b1b);" @click="handleDelete">Remove</button>
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
