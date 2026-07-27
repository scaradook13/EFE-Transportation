<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

definePageMeta({ middleware: 'auth' })

const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()
const isMobileMenuOpen = ref(false)

const navigation = computed(() => {
  const items = [
    { name: 'Dashboard', href: '/', icon: 'i-heroicons-squares-2x2', roles: ['admin', 'dispatcher', 'hr'] },
    { name: 'Taxi Assignment', href: '/assignments', icon: 'i-heroicons-key', roles: ['admin', 'dispatcher'] },
    { name: 'Drivers', href: '/drivers', icon: 'i-heroicons-user-group', roles: ['admin', 'dispatcher', 'hr'] },
    { name: 'Taxi Fleet', href: '/taxi-units', icon: 'i-lucide-car-taxi-front', roles: ['admin', 'dispatcher', 'hr'] },
    { name: 'Users', href: '/users', icon: 'i-heroicons-users', roles: ['admin'] },
    { name: 'Audit Logs', href: '/audit-logs', icon: 'i-heroicons-clipboard-document-list', roles: ['admin'] }
  ]
  return items.filter(item => item.roles.includes(authStore.user?.role || ''))
})

const isActive = (href: string) => {
  if (href === '/') return route.path === '/'
  return route.path.startsWith(href)
}

const logout = async () => {
  await authStore.logout()
  router.push('/login')
}
</script>

<template>
  <div class="flex h-screen overflow-hidden" style="background: #0f1117;">
    <!-- Sidebar Desktop -->
    <aside class="sidebar hidden lg:flex flex-col" style="width: 260px; min-width: 260px;">
      <!-- Logo -->
      <div class="flex items-center gap-3 px-6 py-5 border-b" style="border-color: rgba(255,255,255,0.06);">
        <img src="/logo.png" alt="R&T Logo" class="w-10 h-10 rounded-full object-cover" />
        <div>
          <div class="font-bold text-sm text-white leading-tight">EFE Taxi Dispatch</div>
          <div class="text-xs text-green-400 font-medium">R&T Group of Taxi</div>
        </div>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 px-3 py-4 overflow-y-auto">
        <div class="space-y-1">
          <NuxtLink
            v-for="item in navigation"
            :key="item.href"
            :to="item.href"
            :class="['nav-item', isActive(item.href) ? 'active' : '']"
          >
            <UIcon :name="item.icon" class="w-5 h-5 nav-icon shrink-0" />
            <span>{{ item.name }}</span>
          </NuxtLink>
        </div>
      </nav>

      <!-- User info -->
      <div class="px-4 py-4 border-t" style="border-color: rgba(255,255,255,0.06);">
        <div class="flex items-center gap-3 mb-3">
          <div
            class="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
            style="background: linear-gradient(135deg, #16a34a, #f9a825); color: white;"
          >
            {{ authStore.user?.fullName?.charAt(0)?.toUpperCase() || 'U' }}
          </div>
          <div class="overflow-hidden">
            <p class="text-sm font-semibold text-white truncate">{{ authStore.user?.fullName }}</p>
            <p class="text-xs capitalize" style="color: #4ade80;">{{ authStore.user?.role }}</p>
          </div>
        </div>
        <button
          class="w-full text-left nav-item text-red-400 hover:text-red-300"
          style="color: #f87171;"
          @click="logout"
        >
          <UIcon name="i-heroicons-arrow-right-on-rectangle" class="w-5 h-5 shrink-0" />
          <span>Logout</span>
        </button>
      </div>
    </aside>

    <!-- Main Content -->
    <div class="flex flex-col flex-1 min-w-0 overflow-hidden">
      <!-- Topbar -->
      <header class="topbar flex items-center justify-between gap-4">
        <!-- Mobile menu button -->
        <button class="lg:hidden" @click="isMobileMenuOpen = !isMobileMenuOpen">
          <UIcon name="i-heroicons-bars-3" class="w-6 h-6 text-slate-400" />
        </button>

        <!-- Page title (mobile) -->
        <div class="lg:hidden text-sm font-semibold text-white">EFE Dispatch</div>

        <div class="hidden lg:block">
          <p class="text-slate-400 text-sm">
            Welcome back, <span class="text-white font-medium">{{ authStore.user?.fullName }}</span>
          </p>
        </div>

        <!-- Right actions -->
        <div class="flex items-center gap-3 ml-auto">
        </div>
      </header>

      <!-- Mobile sidebar overlay -->
      <Transition name="fade">
        <div
          v-if="isMobileMenuOpen"
          class="fixed inset-0 z-50 lg:hidden"
          @click="isMobileMenuOpen = false"
        >
          <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <aside class="sidebar absolute left-0 top-0 h-full flex flex-col animate-slideInLeft" style="width: 260px;">
            <div class="flex items-center gap-3 px-6 py-5 border-b" style="border-color: rgba(255,255,255,0.06);">
              <img src="/logo.png" alt="R&T Logo" class="w-10 h-10 rounded-full object-cover" />
              <div>
                <div class="font-bold text-sm text-white leading-tight">EFE Taxi Dispatch</div>
                <div class="text-xs text-green-400 font-medium">R&T Group of Taxi</div>
              </div>
            </div>
            <nav class="flex-1 px-3 py-4 overflow-y-auto">
              <div class="space-y-1">
                <NuxtLink
                  v-for="item in navigation"
                  :key="item.href"
                  :to="item.href"
                  :class="['nav-item', isActive(item.href) ? 'active' : '']"
                  @click="isMobileMenuOpen = false"
                >
                  <UIcon :name="item.icon" class="w-5 h-5 nav-icon shrink-0" />
                  <span>{{ item.name }}</span>
                </NuxtLink>
              </div>
            </nav>
            <div class="px-4 py-4 border-t" style="border-color: rgba(255,255,255,0.06);">
              <button class="w-full text-left nav-item" style="color: #f87171;" @click="logout">
                <UIcon name="i-heroicons-arrow-right-on-rectangle" class="w-5 h-5 shrink-0" />
                <span>Logout</span>
              </button>
            </div>
          </aside>
        </div>
      </Transition>

      <!-- Page content -->
      <main class="flex-1 overflow-y-auto">
        <div class="animate-fadeIn">
          <slot />
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
