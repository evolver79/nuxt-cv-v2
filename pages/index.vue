<script setup lang="ts">
useReveal()
const { active: demoActive } = useKonami()
const { isDark } = useColorMode()
const { offset: rgbOffset } = useScrollRgb()

defineOgImage({
  component: 'OgImageDefault',
  title: 'Joachim Molund',
  subtitle: 'Senior Frontend Developer',
  description: 'Designer turned developer. Building with Vue, Nuxt, Tailwind, and Flutter at BazePort.',
})

useSeoMeta({
  title: 'Joachim Molund — Senior Frontend Developer',
  description: 'Designer turned developer with a decade of frontend experience. Building with Vue, Nuxt, Tailwind, and Flutter at BazePort.',
})
</script>

<template>
  <div class="bg-bg text-text antialiased min-h-screen transition-colors duration-300">
    <!-- SVG filter for RGB channel split (dark mode only) -->
    <svg v-if="isDark" class="absolute w-0 h-0" aria-hidden="true">
      <defs>
        <filter id="rgb-split" color-interpolation-filters="sRGB">
          <feOffset in="SourceGraphic" :dx="rgbOffset" dy="0" result="r" />
          <feColorMatrix in="r" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r" />
          <feOffset in="SourceGraphic" :dx="-rgbOffset" dy="0" result="b" />
          <feColorMatrix in="b" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="b" />
          <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="g" />
          <feBlend mode="screen" in="r" in2="g" result="rg" />
          <feBlend mode="screen" in="rg" in2="b" />
        </filter>
      </defs>
    </svg>

    <ColorModeToggle />
    <div
      class="relative z-[1] max-w-content mx-auto px-[clamp(2rem,6vw,8rem)]"
      :style="rgbOffset && isDark ? { filter: 'url(#rgb-split)' } : {}"
    >
      <HeroSection />
      <SectionDivider quote="it works on my machine" />
      <ExperienceSection />
      <SectionDivider quote="// todo: fix later" />
      <ContactSection />
      <SiteFooter @trigger-demo="demoActive = true" />
    </div>
    <LazyDemoScene :active="demoActive" @close="demoActive = false" />
  </div>
</template>
