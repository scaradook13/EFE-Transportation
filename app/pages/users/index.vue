<script setup lang="ts">
import type { User } from '~/types'

definePageMeta({ layout: 'default', middleware: 'auth' })
useHead({ title: 'Users — EFE Taxi Dispatch System' })

const authStore = useAuthStore()
const router = useRouter()
const toast = useToast()

if (!authStore.isAdmin) router.push('/')

const users = ref<User[]>([])
const loading = ref(false)
const showModal = ref(false)
const editingUser = ref<User | null>(null)
const formLoading = ref(false)

const showDeleteModal = ref(false)
const userToDelete = ref<User | null>(null)
const deleteLoading = ref(false)
const formError = ref('')

import { userSchema, userEditSchema } from '~~/shared/utils/validations'
import { useFormValidation } from '~/composables/useFormValidation'

const form = reactive({
  username: '', password: '', fullName: '',
  role: 'dispatcher' as 'admin' | 'dispatcher' | 'hr', isActive: true
})

const activeSchema = computed(() => editingUser.value ? userEditSchema : userSchema)
const { errors, validate, touch, clearErrors, setErrors } = useFormValidation(activeSchema, form)

const loadUsers = async () => {
  loading.value = true
  try {
    const res = await $fetch<{ data: User[] }>('/api/users')
    users.value = res.data
  } finally { loading.value = false }
}

onMounted(loadUsers)

const resetForm = () => {
  Object.assign(form, { username: '', password: '', fullName: '', role: 'dispatcher', isActive: true })
}

const openCreate = () => {
  editingUser.value = null
  resetForm()
  formError.value = ''
  clearErrors()
  showModal.value = true
}

const openEdit = (user: User) => {
  if (user.isPrimaryAdmin && user._id !== authStore.user?.userId) {
    toast.add({ title: 'Error', description: 'You are not authorized to edit the Primary Administrator account.', color: 'error' })
    return
  }
  editingUser.value = user
  formError.value = ''
  clearErrors()
  Object.assign(form, { username: user.username, password: '', fullName: user.fullName, role: user.role, isActive: user.isActive })
  showModal.value = true
}

const handleSubmit = async () => {
  if (!validate()) return

  formError.value = ''
  formLoading.value = true
  try {
    if (editingUser.value) {
      const payload: Partial<typeof form> = { fullName: form.fullName, role: form.role, isActive: form.isActive }
      if (form.password) payload.password = form.password
      await $fetch(`/api/users/${editingUser.value._id}`, { method: 'PUT', body: payload })
      toast.add({ title: 'User updated', color: 'success' })
    } else {
      await $fetch('/api/users', { method: 'POST', body: form })
      toast.add({ title: 'User created', color: 'success' })
    }
    showModal.value = false
    await loadUsers()
  } catch (err: unknown) {
    formError.value = (err as any)?.data?.message || 'Failed to save user.'
    if ((err as any)?.data?.data?.errors) {
      setErrors((err as any).data.data.errors)
    }
    toast.add({ title: 'Error', description: formError.value, color: 'error' })
  } finally { formLoading.value = false }
}

const toggleActive = async (user: User) => {
  if (user.isPrimaryAdmin && user._id !== authStore.user?.userId) {
    toast.add({ title: 'Error', description: 'You are not authorized to edit the Primary Administrator account.', color: 'error' })
    return
  }
  try {
    await $fetch(`/api/users/${user._id}`, { method: 'PUT', body: { isActive: !user.isActive } })
    toast.add({ title: `User ${user.isActive ? 'deactivated' : 'activated'}`, color: 'success' })
    await loadUsers()
  } catch { toast.add({ title: 'Failed to update user', color: 'error' }) }
}

const confirmDelete = (user: User) => {
  userToDelete.value = user
  showDeleteModal.value = true
}

const handleDelete = async () => {
  if (!userToDelete.value) return
  deleteLoading.value = true
  try {
    await $fetch(`/api/users/${userToDelete.value._id}`, { method: 'DELETE' })
    toast.add({ title: 'User deleted successfully', color: 'success' })
    await loadUsers()
    showDeleteModal.value = false
  } catch (err: unknown) {
    toast.add({ title: 'Error', description: (err as any)?.data?.message || 'Failed to delete user', color: 'error' })
  } finally {
    deleteLoading.value = false
  }
}

const roleColor = (role: string) => {
  if (role === 'admin') return 'text-red-400 bg-red-500/10 border-red-500/20'
  if (role === 'hr') return 'text-blue-400 bg-blue-500/10 border-blue-500/20'
  return 'text-green-400 bg-green-500/10 border-green-500/20'
}
</script>

<template>
    <div class="p-6 space-y-5 animate-fadeIn">
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-white">Users</h1>
          <p class="text-sm text-slate-400 mt-0.5">Manage system users and access roles</p>
        </div>
        <button class="btn-primary" @click="openCreate">
          <UIcon name="i-heroicons-plus" class="w-4 h-4" /> Add User
        </button>
      </div>

      <!-- Users Table -->
      <div class="glass-card overflow-hidden">
        <div v-if="loading" class="p-10 text-center">
          <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 text-green-500 animate-spin mx-auto" />
        </div>
        <div v-else-if="!users.length" class="p-16 text-center">
          <UIcon name="i-heroicons-users" class="w-12 h-12 text-slate-700 mx-auto mb-3" />
          <p class="text-slate-400">No users found</p>
        </div>
        <div v-else class="overflow-x-auto">
          <table class="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Username</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in users" :key="user._id">
                <td>
                  <div class="flex items-center gap-3">
                    <div
                      class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                      style="background: linear-gradient(135deg, #16a34a, #f9a825); color: white;"
                    >{{ user.fullName.charAt(0) }}</div>
                    <span class="text-white font-medium">{{ user.fullName }}</span>
                  </div>
                </td>
                <td class="font-mono text-sm text-slate-300">{{ user.username }}</td>
                <td>
                  <span :class="['px-2 py-0.5 rounded-full text-xs font-semibold capitalize border', roleColor(user.role)]">
                    {{ user.role }}
                  </span>
                </td>
                <td>
                  <span :class="['px-2 py-0.5 rounded-full text-xs font-medium', user.isActive ? 'badge-active' : 'badge-cancelled']">
                    {{ user.isActive ? 'Active' : 'Inactive' }}
                  </span>
                </td>
                <td class="text-slate-400 text-xs">{{ new Date(user.createdAt).toLocaleDateString('en-PH') }}</td>
                <td>
                  <div class="flex items-center gap-2">
                    <template v-if="user.isPrimaryAdmin && user._id !== authStore.user?.userId">
                      <div class="p-1.5 cursor-not-allowed group relative" title="Primary Administrator account is protected and cannot be edited.">
                        <UIcon name="i-heroicons-lock-closed" class="w-4 h-4 text-amber-500" />
                      </div>
                    </template>
                    <template v-else>
                      <button class="p-1.5 rounded-lg hover:bg-white/5 transition-colors" title="Edit" @click="openEdit(user)">
                        <UIcon name="i-heroicons-pencil-square" class="w-4 h-4 text-blue-400" />
                      </button>
                      <button
                        v-if="user._id !== authStore.user?.userId"
                        class="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                        :title="user.isActive ? 'Deactivate' : 'Activate'"
                        @click="toggleActive(user)"
                      >
                        <UIcon
                          :name="user.isActive ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'"
                          class="w-4 h-4"
                          :class="user.isActive ? 'text-yellow-400' : 'text-green-400'"
                        />
                      </button>
                      <template v-if="user.isPrimaryAdmin">
                        <div class="p-1.5 cursor-not-allowed group relative" title="Primary Administrator cannot be deleted.">
                          <UIcon name="i-heroicons-shield-check" class="w-4 h-4 text-amber-500" />
                        </div>
                      </template>
                      <template v-else-if="user._id !== authStore.user?.userId">
                        <button
                          class="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
                          title="Delete User"
                          @click="confirmDelete(user)"
                        >
                          <UIcon name="i-heroicons-trash" class="w-4 h-4 text-red-400 hover:text-red-300" />
                        </button>
                      </template>
                    </template>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- User Modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="showModal = false" />
          <div class="relative glass-card p-6 max-w-md w-full animate-fadeIn">
            <div class="flex items-center justify-between mb-6">
              <h2 class="text-lg font-bold text-white">{{ editingUser ? 'Edit User' : 'Create User' }}</h2>
              <button class="p-2 hover:bg-white/5 rounded-lg transition-colors" @click="showModal = false">
                <UIcon name="i-heroicons-x-mark" class="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <form @submit.prevent="handleSubmit" class="space-y-4">
              <div v-if="formError" class="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2">
                <UIcon name="i-heroicons-exclamation-circle" class="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <p class="text-sm text-red-400 font-medium">{{ formError }}</p>
              </div>
              <div>
                <label class="form-label">Full Name *</label>
                <input v-model="form.fullName" @blur="touch('fullName')" type="text" class="form-input" :class="{ 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20': errors.fullName }" required />
                <p v-if="errors.fullName" class="mt-1 text-xs text-red-400">{{ errors.fullName }}</p>
              </div>
              <div>
                <label class="form-label">Username *</label>
                <input v-model="form.username" @blur="touch('username')" type="text" class="form-input" :class="{ 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20': errors.username }" :disabled="!!editingUser" required />
                <p v-if="errors.username" class="mt-1 text-xs text-red-400">{{ errors.username }}</p>
              </div>
              <div>
                <label class="form-label">{{ editingUser ? 'New Password (leave blank to keep)' : 'Password *' }}</label>
                <input v-model="form.password" @blur="touch('password')" type="password" class="form-input" :class="{ 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20': errors.password }" :required="!editingUser" placeholder="Min 6 characters" />
                <p v-if="errors.password" class="mt-1 text-xs text-red-400">{{ errors.password }}</p>
              </div>
              <div>
                <label class="form-label">Role *</label>
                <select v-model="form.role" @blur="touch('role')" class="form-input" :class="{ 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20': errors.role }" required>
                  <option value="admin">Admin</option>
                  <option value="dispatcher">Dispatcher</option>
                  <option value="hr">HR</option>
                </select>
                <p v-if="errors.role" class="mt-1 text-xs text-red-400">{{ errors.role }}</p>
              </div>
              <div class="flex items-center gap-3">
                <input id="isActive" v-model="form.isActive" type="checkbox" class="w-4 h-4 rounded" />
                <label for="isActive" class="text-sm text-slate-300">Account Active</label>
              </div>
              <div class="flex gap-3 pt-2">
                <button type="button" class="btn-secondary flex-1" @click="showModal = false">Cancel</button>
                <button type="submit" class="btn-primary flex-1" :disabled="formLoading">
                  <UIcon v-if="formLoading" name="i-heroicons-arrow-path" class="w-4 h-4 animate-spin" />
                  {{ formLoading ? 'Saving...' : (editingUser ? 'Update' : 'Create') }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Delete Confirmation Modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showDeleteModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="showDeleteModal = false" />
          <div class="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-2xl">
            <div class="flex items-center gap-3 text-red-400 mb-4">
              <div class="p-3 bg-red-500/10 rounded-full">
                <UIcon name="i-heroicons-exclamation-triangle" class="w-6 h-6" />
              </div>
              <h2 class="text-xl font-bold text-white">Delete User?</h2>
            </div>
            
            <p class="text-slate-300 mb-2">
              Are you sure you want to permanently delete <span class="font-bold text-white">{{ userToDelete?.fullName }}</span>?
            </p>
            <p class="text-red-400 text-sm mb-6">This action cannot be undone.</p>
            
            <div class="flex gap-3">
              <button type="button" class="btn-secondary flex-1" @click="showDeleteModal = false">Cancel</button>
              <button type="button" class="btn-primary flex-1 !bg-red-600 hover:!bg-red-500" @click="handleDelete" :disabled="deleteLoading">
                <UIcon v-if="deleteLoading" name="i-heroicons-arrow-path" class="w-4 h-4 animate-spin" />
                {{ deleteLoading ? 'Deleting...' : 'Delete' }}
              </button>
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
