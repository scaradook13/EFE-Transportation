<template>
  <div
    class="min-h-screen flex items-center justify-center relative overflow-hidden"
    style="background: radial-gradient(ellipse at 20% 50%, rgba(22,163,74,0.08) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(249,168,37,0.06) 0%, transparent 60%), #0f1117;"
  >
    <!-- Animated background dots -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <div
        v-for="i in 20"
        :key="i"
        class="absolute rounded-full opacity-10"
        :style="{
          width: `${Math.random() * 4 + 1}px`,
          height: `${Math.random() * 4 + 1}px`,
          background: i % 2 === 0 ? '#22c55e' : '#f9a825',
          top: `${Math.random() * 100}%`,
          left: `${Math.random() * 100}%`
        }"
      />
    </div>

    <slot />
  </div>
</template>
