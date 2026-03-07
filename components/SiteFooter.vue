<script setup lang="ts">
defineEmits<{ 'trigger-demo': [] }>()
</script>

<template>
  <div class="pt-16 pb-10 border-t border-faint flex justify-between">
    <span class="font-mono text-[0.625rem] text-muted tracking-[0.04em]">Joachim Molund</span>
    <span
      class="font-mono text-[0.625rem] text-muted tracking-[0.15em] opacity-25 cursor-pointer hover:opacity-50 transition-opacity duration-300"
      title="░▒▓"
      @click="$emit('trigger-demo')"
    >░▒▓</span>
    <span class="font-mono text-[0.625rem] text-muted tracking-[0.04em]">59.1405°N 9.6569°E</span>
    <span class="font-mono text-[0.625rem] text-muted tracking-[0.04em]">2026</span>
  </div>
</template>
