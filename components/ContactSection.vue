<script setup lang="ts">
const contacts = [
  { key: 'Email', value: 'hei@jmolund.no', href: 'mailto:hei@jmolund.no' },
  { key: 'LinkedIn', value: 'linkedin.com/in/joachim-molund', href: 'https://www.linkedin.com/in/joachim-molund-8a26811a/', external: true },
  { key: 'Location', value: 'Porsgrunn, Norway' },
]
</script>

<template>
  <div class="py-[clamp(3rem,6vw,5rem)]">
    <div class="reveal">
      <SectionLabel>Contact</SectionLabel>
      <div class="flex flex-col gap-3">
        <div v-for="(c, i) in contacts" :key="i" class="flex gap-6 items-baseline">
          <span class="font-mono text-[0.6875rem] text-muted min-w-[80px] uppercase tracking-[0.04em]">
            {{ c.key }}
          </span>
          <span class="text-base text-text">
            <a
              v-if="c.href"
              :href="c.href"
              :target="c.external ? '_blank' : undefined"
              class="text-text underline underline-offset-[3px] decoration-faint hover:decoration-text transition-[text-decoration-color] duration-200"
            >{{ c.value }}</a>
            <template v-else>{{ c.value }}</template>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
