<script setup lang="ts">
const { isDark, toggle } = useColorMode()
</script>

<template>
  <button
    @click="toggle"
    class="fixed top-6 right-6 z-50 font-mono text-[0.625rem] text-muted tracking-[0.04em] uppercase hover:text-text transition-colors duration-200 cursor-pointer"
    :title="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
  >
    {{ isDark ? '☀' : '☾' }}
  </button>
</template>
