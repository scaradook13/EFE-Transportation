<script setup lang="ts">
import { useDriverStore } from '~/stores/drivers'
import type { Driver, CreateDriverPayload } from '~/types'

definePageMeta({ layout: 'default', middleware: 'auth' })
useHead({ title: 'Drivers — EFE Taxi Dispatch System' })

const authStore = useAuthStore()
const driverStore = useDriverStore()
const toast = useToast()

const search = ref('')
const statusFilter = ref('')
const page = ref(1)
const showModal = ref(false)
const showDeleteModal = ref(false)
const editingDriver = ref<Driver | null>(null)
const deletingDriver = ref<Driver | null>(null)
const formLoading = ref(false)
import { driverSchema } from '~~/shared/utils/validations'
import { useFormValidation } from '~/composables/useFormValidation'

const formError = ref('')

const form = reactive<CreateDriverPayload>({
  fullName: '', address: '', contactNumber: '',
  birthDate: '', emergencyContact: { name: '', relationship: '', contactNumber: '' },
  dateHired: '', licenseNumber: '', licenseExpiration: '', photo: null, photoFileId: null,
  tinId: '', sssId: '', philhealthId: '', pagibigId: '',
  employmentStatus: 'Active'
})

const { errors, validate, touch, clearErrors, setErrors } = useFormValidation(driverSchema, form)

const resetForm = () => {
  Object.assign(form, {
    fullName: '', address: '', contactNumber: '',
    birthDate: '', emergencyContact: { name: '', relationship: '', contactNumber: '' },
    dateHired: '', licenseNumber: '', licenseExpiration: '', photo: null, photoFileId: null,
    tinId: '', sssId: '', philhealthId: '', pagibigId: '',
    employmentStatus: 'Active'
  })
  clearErrors()
  editingDriver.value = null
}

const loadDrivers = () => {
  const params: Record<string, string | number> = { page: page.value, limit: 10 }
  if (search.value) params.search = search.value
  if (statusFilter.value) params.employmentStatus = statusFilter.value
  driverStore.fetchAll(params)
}

onMounted(loadDrivers)

watch([search, statusFilter], useDebounceFn(() => { page.value = 1; loadDrivers() }, 300))
watch(page, loadDrivers)

const openCreate = () => { resetForm(); formError.value = ''; showModal.value = true }
const openEdit = (driver: Driver) => {
  editingDriver.value = driver
  formError.value = ''
  clearErrors()
  Object.assign(form, {
    fullName: driver.fullName,
    address: driver.address,
    contactNumber: driver.contactNumber,
    birthDate: driver.birthDate?.split('T')[0],
    dateHired: driver.dateHired?.split('T')[0] || '',
    emergencyContact: { ...driver.emergencyContact },
    licenseNumber: driver.licenseNumber,
    licenseExpiration: driver.licenseExpiration?.split('T')[0],
    photo: driver.photo,
    photoFileId: driver.photoFileId || null,
    tinId: driver.tinId || '',
    sssId: driver.sssId || '',
    philhealthId: driver.philhealthId || '',
    pagibigId: driver.pagibigId || '',
    employmentStatus: driver.employmentStatus
  })
  showModal.value = true
}

const handlePhotoUpload = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  const fd = new FormData()
  fd.append('photo', file)
  try {
    const res = await $fetch<{ data: { url: string, fileId: string } }>('/api/uploads/drivers', { method: 'POST', body: fd })
    form.photo = res.data.url
    form.photoFileId = res.data.fileId
    toast.add({ title: 'Photo uploaded', color: 'success' })
  } catch {
    toast.add({ title: 'Photo upload failed', color: 'error' })
  }
}

const handleSubmit = async () => {
  if (!validate()) return

  formError.value = ''
  formLoading.value = true
  try {
    if (editingDriver.value) {
      await driverStore.update(editingDriver.value._id, form)
      toast.add({ title: 'Driver updated', color: 'success' })
    } else {
      await driverStore.create(form)
      toast.add({ title: 'Driver created', color: 'success' })
    }
    showModal.value = false
    resetForm()
    loadDrivers()
  } catch (err: unknown) {
    formError.value = (err as any)?.data?.message || 'Failed to save driver.'
    if ((err as any)?.data?.data?.errors) {
      setErrors((err as any).data.data.errors)
    }
    toast.add({ title: 'Error', description: formError.value, color: 'error' })
  } finally {
    formLoading.value = false
  }
}

const confirmDelete = (driver: Driver) => { deletingDriver.value = driver; showDeleteModal.value = true }
const handleDelete = async () => {
  if (!deletingDriver.value) return
  try {
    await driverStore.remove(deletingDriver.value._id)
    toast.add({ title: 'Driver deleted', color: 'success' })
    showDeleteModal.value = false
    loadDrivers()
  } catch {
    toast.add({ title: 'Delete failed', color: 'error' })
  }
}

const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('en-PH') : '—'
const isLicenseExpiringSoon = (d: string) => {
  const exp = new Date(d)
  const diff = (exp.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  return diff <= 60 && diff >= 0
}
const isLicenseExpired = (d: string) => new Date(d) < new Date()
</script>

<template>
    <div class="p-6 space-y-5 animate-fadeIn">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-white">Drivers</h1>
          <p class="text-sm text-slate-400 mt-0.5">Manage all registered drivers</p>
        </div>
        <button
          v-if="authStore.canManageDrivers"
          class="btn-primary"
          @click="openCreate"
        >
          <UIcon name="i-heroicons-plus" class="w-4 h-4" />
          Add Driver
        </button>
      </div>

      <!-- Filters -->
      <div class="glass-card p-4 flex flex-col md:flex-row gap-4">
        <div class="relative w-full md:w-[65%] lg:w-[75%]">
          <UIcon name="i-heroicons-magnifying-glass" class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none" style="color: #94a3b8; z-index: 1;" />
          <input v-model="search" type="text" class="form-input search-input w-full" placeholder="Search by name, ID, license..." />
        </div>
        <select v-model="statusFilter" class="form-input filter-dropdown w-full md:w-[35%] lg:w-[25%]">
          <option value="">All Status</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
          <option value="Expired License">Expired License</option>
        </select>
      </div>

      <!-- Table -->
      <div class="glass-card overflow-hidden">
        <div v-if="driverStore.loading" class="p-10 text-center">
          <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 text-green-500 animate-spin mx-auto" />
        </div>
        <div v-else-if="!driverStore.drivers.length" class="p-16 text-center">
          <UIcon name="i-heroicons-user-group" class="w-12 h-12 text-slate-700 mx-auto mb-3" />
          <p class="text-slate-400 font-medium">No drivers found</p>
          <p class="text-slate-600 text-sm mt-1">Try adjusting your search or add a new driver</p>
        </div>
        <div v-else>
          <div class="overflow-x-auto">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Driver</th>
                  <th>Driver ID</th>
                  <th>Contact</th>
                  <th>License No.</th>
                  <th>License Exp.</th>
                  <th>Duty Status</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="driver in driverStore.drivers" :key="driver._id">
                  <td>
                    <div class="flex items-center gap-3">
                      <div v-if="driver.photo" class="w-9 h-9 rounded-full overflow-hidden shrink-0">
                        <img :src="driver.photo" :alt="driver.fullName" class="w-full h-full object-cover" />
                      </div>
                      <div v-else class="w-9 h-9 rounded-full bg-green-900/30 border border-green-500/20 flex items-center justify-center shrink-0">
                        <span class="text-green-400 text-sm font-bold">{{ driver.fullName.charAt(0) }}</span>
                      </div>
                      <div>
                        <NuxtLink :to="`/drivers/${driver._id}`" class="text-white font-medium hover:text-green-400 transition-colors">
                          {{ driver.fullName }}
                        </NuxtLink>
                        <p class="text-xs text-slate-500">{{ driver.address.substring(0, 30) }}...</p>
                      </div>
                    </div>
                  </td>
                  <td><span class="font-mono text-xs text-slate-300">{{ driver.driverId }}</span></td>
                  <td class="text-slate-300">{{ driver.contactNumber }}</td>
                  <td class="font-mono text-xs text-slate-300">{{ driver.licenseNumber }}</td>
                  <td>
                    <div class="flex items-center gap-1.5">
                      <span :class="[
                        'text-xs',
                        isLicenseExpired(driver.licenseExpiration) ? 'text-red-400' :
                        isLicenseExpiringSoon(driver.licenseExpiration) ? 'text-yellow-400' : 'text-slate-400'
                      ]">{{ formatDate(driver.licenseExpiration) }}</span>
                      <UIcon v-if="isLicenseExpired(driver.licenseExpiration)" name="i-heroicons-exclamation-circle" class="w-3.5 h-3.5 text-red-400" />
                      <UIcon v-else-if="isLicenseExpiringSoon(driver.licenseExpiration)" name="i-heroicons-clock" class="w-3.5 h-3.5 text-yellow-400" />
                    </div>
                  </td>
                  <td>
                    <span :class="[
                      'px-2 py-0.5 rounded-full text-xs font-medium',
                      (driver as any).operationalStatus === 'Active' ? 'badge-active' :
                      (driver as any).operationalStatus === 'Not Available' ? 'badge-cancelled' : 'badge-available'
                    ]">
                      {{ (driver as any).operationalStatus === 'Active' ? 'On Duty' : 
                         (driver as any).operationalStatus === 'Not Available' ? 'Not Available' : 'Available' }}
                    </span>
                  </td>
                  <td>
                    <span :class="['px-2 py-0.5 rounded-full text-xs font-medium', 
                      driver.employmentStatus === 'Active' ? 'badge-completed' : 
                      driver.employmentStatus === 'Expired License' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'badge-cancelled']">
                      {{ driver.employmentStatus }}
                    </span>
                  </td>
                  <td>
                    <div class="flex items-center gap-2">
                      <NuxtLink :to="`/drivers/${driver._id}`" class="p-1.5 rounded-lg hover:bg-white/5 transition-colors">
                        <UIcon name="i-heroicons-eye" class="w-4 h-4 text-slate-400" />
                      </NuxtLink>
                      <button v-if="authStore.canManageDrivers" class="p-1.5 rounded-lg hover:bg-white/5 transition-colors" @click="openEdit(driver)">
                        <UIcon name="i-heroicons-pencil-square" class="w-4 h-4 text-blue-400" />
                      </button>
                      <div v-if="authStore.canManageDrivers" :title="(driver as any).operationalStatus === 'Active' ? 'This driver is currently on duty and cannot be deleted.' : undefined">
                        <button class="p-1.5 rounded-lg transition-colors" :class="(driver as any).operationalStatus === 'Active' ? 'opacity-40 cursor-not-allowed' : 'hover:bg-red-500/10'" :disabled="(driver as any).operationalStatus === 'Active'" @click="confirmDelete(driver)">
                          <UIcon name="i-heroicons-trash" class="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination -->
          <div v-if="driverStore.pagination && driverStore.pagination.pages > 1" class="flex items-center justify-between px-5 py-4 border-t" style="border-color: rgba(255,255,255,0.06);">
            <p class="text-xs text-slate-500">
              Showing {{ ((page - 1) * 10) + 1 }}–{{ Math.min(page * 10, driverStore.pagination.total) }} of {{ driverStore.pagination.total }}
            </p>
            <div class="flex gap-2">
              <button :disabled="page <= 1" class="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40" @click="page--">
                <UIcon name="i-heroicons-chevron-left" class="w-4 h-4" />
              </button>
              <button :disabled="page >= driverStore.pagination.pages" class="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40" @click="page++">
                <UIcon name="i-heroicons-chevron-right" class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Driver Form Modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="showModal = false">
          <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="showModal = false" />
          <div class="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto glass-card p-6 animate-fadeIn">
            <div class="flex items-center justify-between mb-6">
              <h2 class="text-lg font-bold text-white">{{ editingDriver ? 'Edit Driver' : 'Add New Driver' }}</h2>
              <button class="p-2 rounded-lg hover:bg-white/5 transition-colors" @click="showModal = false">
                <UIcon name="i-heroicons-x-mark" class="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form @submit.prevent="handleSubmit" class="space-y-4">
              <div v-if="formError" class="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2">
                <UIcon name="i-heroicons-exclamation-circle" class="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <p class="text-sm text-red-400 font-medium">{{ formError }}</p>
              </div>
              <!-- Photo -->
              <div class="flex items-center gap-4">
                <div class="w-16 h-16 rounded-full overflow-hidden border-2 border-white/10">
                  <img v-if="form.photo" :src="form.photo" alt="Preview" class="w-full h-full object-cover" />
                  <div v-else class="w-full h-full bg-green-900/20 flex items-center justify-center">
                    <UIcon name="i-heroicons-user" class="w-7 h-7 text-green-600" />
                  </div>
                </div>
                <div>
                  <label class="btn-secondary text-xs cursor-pointer">
                    <UIcon name="i-heroicons-camera" class="w-3.5 h-3.5" />
                    Upload Photo
                    <input type="file" class="hidden" accept="image/*" @change="handlePhotoUpload" />
                  </label>
                  <p class="text-xs text-slate-600 mt-1">JPG, PNG up to 5MB</p>
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="form-label">Full Name *</label>
                  <input v-model="form.fullName" @blur="touch('fullName')" type="text" class="form-input" :class="{ 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20': errors.fullName }" required placeholder="Juan dela Cruz" />
                  <p v-if="errors.fullName" class="mt-1 text-xs text-red-400">{{ errors.fullName }}</p>
                </div>
                <div>
                  <label class="form-label">Contact Number *</label>
                  <input v-model="form.contactNumber" @blur="touch('contactNumber')" type="text" class="form-input" :class="{ 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20': errors.contactNumber }" required placeholder="09171234567" />
                  <p v-if="errors.contactNumber" class="mt-1 text-xs text-red-400">{{ errors.contactNumber }}</p>
                </div>
                <div class="sm:col-span-2">
                  <label class="form-label">Address *</label>
                  <input v-model="form.address" @blur="touch('address')" type="text" class="form-input" :class="{ 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20': errors.address }" required placeholder="123 Main St, Manila" />
                  <p v-if="errors.address" class="mt-1 text-xs text-red-400">{{ errors.address }}</p>
                </div>
                <div>
                  <label class="form-label">Birth Date *</label>
                  <input v-model="form.birthDate" @blur="touch('birthDate')" type="date" class="form-input" :class="{ 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20': errors.birthDate }" required />
                  <p v-if="errors.birthDate" class="mt-1 text-xs text-red-400">{{ errors.birthDate }}</p>
                </div>
                <div>
                  <label class="form-label">Employment Status</label>
                  <select v-model="form.employmentStatus" @blur="touch('employmentStatus')" class="form-input" :class="{ 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20': errors.employmentStatus }">
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                  <p v-if="errors.employmentStatus" class="mt-1 text-xs text-red-400">{{ errors.employmentStatus }}</p>
                </div>
                <div>
                  <label class="form-label">Date Hired</label>
                  <input v-model="form.dateHired" @blur="touch('dateHired')" type="date" class="form-input" :class="{ 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20': errors.dateHired }" />
                  <p v-if="errors.dateHired" class="mt-1 text-xs text-red-400">{{ errors.dateHired }}</p>
                </div>
                <div class="hidden sm:block"></div> <!-- Spacer to maintain alignment -->
                <div>
                  <label class="form-label">License Number *</label>
                  <input v-model="form.licenseNumber" @blur="touch('licenseNumber')" type="text" class="form-input" :class="{ 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20': errors.licenseNumber }" required placeholder="N01-23-456789" />
                  <p v-if="errors.licenseNumber" class="mt-1 text-xs text-red-400">{{ errors.licenseNumber }}</p>
                </div>
                <div>
                  <label class="form-label">License Expiration *</label>
                  <input v-model="form.licenseExpiration" @blur="touch('licenseExpiration')" type="date" class="form-input" :class="{ 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20': errors.licenseExpiration }" required />
                  <p v-if="errors.licenseExpiration" class="mt-1 text-xs text-red-400">{{ errors.licenseExpiration }}</p>
                </div>
              </div>

              <div class="border-t pt-4" style="border-color: rgba(255,255,255,0.06);">
                <p class="text-sm font-medium text-slate-300 mb-3">Government IDs</p>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label class="form-label">TIN ID</label>
                    <input v-model="form.tinId" @blur="touch('tinId')" type="text" class="form-input" :class="{ 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20': errors.tinId }" placeholder="123-456-789-000" />
                    <p v-if="errors.tinId" class="mt-1 text-xs text-red-400">{{ errors.tinId }}</p>
                  </div>
                  <div>
                    <label class="form-label">SSS ID</label>
                    <input v-model="form.sssId" @blur="touch('sssId')" type="text" class="form-input" :class="{ 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20': errors.sssId }" placeholder="12-3456789-0" />
                    <p v-if="errors.sssId" class="mt-1 text-xs text-red-400">{{ errors.sssId }}</p>
                  </div>
                  <div>
                    <label class="form-label">PhilHealth ID</label>
                    <input v-model="form.philhealthId" @blur="touch('philhealthId')" type="text" class="form-input" :class="{ 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20': errors.philhealthId }" placeholder="12-345678901-2" />
                    <p v-if="errors.philhealthId" class="mt-1 text-xs text-red-400">{{ errors.philhealthId }}</p>
                  </div>
                  <div>
                    <label class="form-label">Pag-IBIG ID</label>
                    <input v-model="form.pagibigId" @blur="touch('pagibigId')" type="text" class="form-input" :class="{ 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20': errors.pagibigId }" placeholder="1234-5678-9012" />
                    <p v-if="errors.pagibigId" class="mt-1 text-xs text-red-400">{{ errors.pagibigId }}</p>
                  </div>
                </div>
              </div>

              <div class="border-t pt-4" style="border-color: rgba(255,255,255,0.06);">
                <p class="text-sm font-medium text-slate-300 mb-3">Emergency Contact</p>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label class="form-label">Name</label>
                    <input v-model="form.emergencyContact.name" @blur="touch('emergencyContact.name')" type="text" class="form-input" :class="{ 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20': errors['emergencyContact.name'] }" />
                    <p v-if="errors['emergencyContact.name']" class="mt-1 text-xs text-red-400">{{ errors['emergencyContact.name'] }}</p>
                  </div>
                  <div>
                    <label class="form-label">Relationship</label>
                    <input v-model="form.emergencyContact.relationship" @blur="touch('emergencyContact.relationship')" type="text" class="form-input" :class="{ 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20': errors['emergencyContact.relationship'] }" />
                    <p v-if="errors['emergencyContact.relationship']" class="mt-1 text-xs text-red-400">{{ errors['emergencyContact.relationship'] }}</p>
                  </div>
                  <div>
                    <label class="form-label">Contact No.</label>
                    <input v-model="form.emergencyContact.contactNumber" @blur="touch('emergencyContact.contactNumber')" type="text" class="form-input" :class="{ 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20': errors['emergencyContact.contactNumber'] }" />
                    <p v-if="errors['emergencyContact.contactNumber']" class="mt-1 text-xs text-red-400">{{ errors['emergencyContact.contactNumber'] }}</p>
                  </div>
                </div>
              </div>

              <div class="flex gap-3 pt-2">
                <button type="button" class="btn-secondary flex-1" @click="showModal = false">Cancel</button>
                <button type="submit" class="btn-primary flex-1" :disabled="formLoading">
                  <UIcon v-if="formLoading" name="i-heroicons-arrow-path" class="w-4 h-4 animate-spin" />
                  {{ formLoading ? 'Saving...' : (editingDriver ? 'Update Driver' : 'Create Driver') }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Delete Confirm Modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showDeleteModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="showDeleteModal = false" />
          <div class="relative glass-card p-6 max-w-sm w-full animate-fadeIn text-center">
            <div class="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <UIcon name="i-heroicons-trash" class="w-6 h-6 text-red-400" />
            </div>
            <h3 class="text-lg font-bold text-white mb-2">Delete Driver?</h3>
            <p class="text-slate-400 text-sm mb-5">Are you sure you want to permanently delete this driver?<br/><br/>This action cannot be undone.</p>
            <div class="flex gap-3">
              <button class="btn-secondary flex-1" @click="showDeleteModal = false">Cancel</button>
              <button class="btn-primary flex-1" style="background: linear-gradient(135deg, #dc2626, #991b1b);" @click="handleDelete">Delete</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
