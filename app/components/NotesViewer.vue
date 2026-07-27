<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'

const props = defineProps({
  title: {
    type: String,
    default: 'Notes'
  },
  content: {
    type: String,
    default: ''
  },
  maxLength: {
    type: Number,
    default: 50
  }
})

const isOpen = ref(false)
const eyeBtnRef = ref<HTMLButtonElement | null>(null)
const modalRef = ref<HTMLElement | null>(null)

const isTruncated = computed(() => {
  return props.content && props.content.length > props.maxLength
})

const displayText = computed(() => {
  if (!props.content) return '—'
  if (!isTruncated.value) return props.content
  return props.content.slice(0, props.maxLength) + '...'
})

const openModal = async () => {
  if (isTruncated.value) {
    isOpen.value = true
    await nextTick()
    modalRef.value?.focus()
  }
}

const closeModal = () => {
  isOpen.value = false
  nextTick(() => {
    eyeBtnRef.value?.focus()
  })
}

onKeyStroke('Escape', (e) => {
  if (isOpen.value) {
    e.preventDefault()
    closeModal()
  }
})
</script>

<template>
  <div class="flex items-center gap-2">
    <span class="text-xs text-slate-400">{{ displayText }}</span>
    
    <button 
      v-if="isTruncated"
      ref="eyeBtnRef"
      class="text-slate-500 hover:text-white transition-colors"
      title="View Full Notes"
      @click.stop="openModal"
    >
      <UIcon name="i-heroicons-eye" class="w-4 h-4" />
    </button>

    <Teleport to="body">
      <Transition name="fade">
        <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="closeModal" />
          <div 
            ref="modalRef"
            class="relative w-full max-w-lg bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col max-h-[90vh]"
            role="dialog"
            aria-modal="true"
            tabindex="-1"
          >
            <div class="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
              <h2 class="text-xl font-bold text-white">{{ title }}</h2>
              <button class="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/5" @click="closeModal">
                <UIcon name="i-heroicons-x-mark" class="w-5 h-5" />
              </button>
            </div>
            
            <div class="overflow-y-auto pr-2 custom-scrollbar flex-1">
              <p class="text-slate-300 text-sm whitespace-pre-wrap break-words leading-relaxed">
                {{ content }}
              </p>
            </div>
            
            <div class="mt-6 flex justify-end">
              <button class="btn-secondary px-4 py-2 text-sm font-medium" @click="closeModal">Close</button>
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

.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: rgba(255, 255, 255, 0.2);
}
</style>
