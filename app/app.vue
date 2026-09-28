<script setup lang="ts">
useHead({
  link: [
    { rel: 'icon', type: 'image/png', href: '/logo.png?v=3' },
    { rel: 'shortcut icon', type: 'image/png', href: '/logo.png?v=3' },
    { rel: 'apple-touch-icon', href: '/logo.png?v=3' }
  ]
})
</script>

<template>
  <div class="min-h-screen" style="background: #0f1117;">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>
