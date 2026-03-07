<script setup lang="ts">
defineProps<{
  title?: string
  subtitle?: string
  description?: string
}>()
</script>

<template>
  <div
    :style="{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      padding: '80px',
      backgroundColor: '#f0ebe3',
      fontFamily: 'Inter, sans-serif',
    }"
  >
    <div
      :style="{
        fontSize: '72px',
        fontWeight: 600,
        color: '#2a2a2a',
        lineHeight: 1.15,
        marginBottom: '24px',
      }"
    >
      {{ title || 'Joachim Molund' }}
    </div>
    <div
      :style="{
        fontSize: '36px',
        fontWeight: 400,
        color: '#8a8580',
        marginBottom: '40px',
      }"
    >
      {{ subtitle || 'Senior Frontend Developer' }}
    </div>
    <div
      :style="{
        fontSize: '24px',
        fontWeight: 400,
        color: '#8a8580',
        lineHeight: 1.6,
        maxWidth: '900px',
      }"
    >
      {{ description || 'Designer turned developer. Building with Vue, Nuxt, Tailwind, and Flutter at BazePort.' }}
    </div>
    <div
      :style="{
        position: 'absolute',
        bottom: '60px',
        right: '80px',
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: '18px',
        color: '#d5cfc7',
        letterSpacing: '0.15em',
      }"
    >
      ░▒▓
    </div>
  </div>
</template>
