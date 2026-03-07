<script setup lang="ts">
const experience = [
  {
    company: 'BazePort',
    role: 'Frontend Developer',
    year: '2023 —',
    stack: ['vuejs', 'nuxtjs', 'tailwindcss', 'flutter', 'storyblok'],
  },
  {
    company: 'Vokser',
    former: 'ItumX',
    role: 'Frontend Developer',
    year: '2022 — 23',
    stack: ['vuejs', 'tailwindcss', 'javascript', 'sitecore'],
  },
  {
    company: 'Allegro',
    role: 'Interaction Designer / Frontend',
    year: '2016 — 22',
    stack: ['react', 'vuejs', 'gatsby', 'figma', 'sketch'],
  },
  {
    company: 'Mediateam Kommunikasjon',
    role: 'Web Designer / Developer',
    year: '2015 — 16',
    stack: ['wordpress', 'php', 'sass', 'photoshop', 'indesign'],
  },
  {
    company: 'Freelance',
    role: 'Webdesign / Frontend',
    year: '2014 — 16',
    stack: ['vuejs', 'wordpress', 'php'],
  },
  {
    company: 'SpenstigWEB',
    role: 'Web Designer / Developer',
    year: '2013 — 14',
    stack: ['wordpress', 'bootstrap', 'php', 'sass', 'less'],
  },
  {
    company: 'Stengraff Reklamebyrå',
    role: 'AD / Graphic Designer',
    year: '2006 — 11',
    stack: ['photoshop', 'illustrator', 'wordpress', 'php', 'css3'],
  },
]

const iconUrl = (name: string) =>
  `https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/${name}/${name}-original.svg`

const iconFallbacks: Record<string, string> = {
  storyblok: 'https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/storyblok.svg',
  sitecore: 'https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/sitecore.svg',
  nuxtjs: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/nuxtjs/nuxtjs-original.svg',
  tailwindcss: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/tailwindcss/tailwindcss-original.svg',
  indesign: 'https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/adobeindesign.svg',
}

const monoIcons = new Set(['storyblok', 'sitecore', 'indesign'])

function getIconUrl(name: string) {
  return iconFallbacks[name] || iconUrl(name)
}

function isMono(name: string) {
  return monoIcons.has(name)
}

onMounted(() => {
  const items = document.querySelectorAll('.exp-item')
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible')
          observer.unobserve(entry.target)
        }
      })
    },
    { threshold: 0.15 },
  )
  items.forEach((el) => observer.observe(el))
})
</script>

<template>
  <div class="py-[clamp(3rem,6vw,5rem)]">

    <SectionLabel class="reveal">Experience</SectionLabel>
    <div>
      <div
        v-for="(item, i) in experience"
        :key="i"
        class="exp-item grid grid-cols-[1fr_auto] gap-4 py-5 border-b border-faint/40"
        :style="{ transitionDelay: `${i * 80}ms` }"
      >
        <div>
          <div class="text-lg font-medium text-text">
            {{ item.company }}<span v-if="item.former" class="text-sm font-normal text-muted ml-2">(fmr. {{ item.former }})</span>
          </div>
          <div class="text-sm text-muted mt-0.5 leading-relaxed">{{ item.role }}</div>
          <div class="flex items-center gap-2.5 mt-3">
            <img
              v-for="tech in item.stack"
              :key="tech"
              :src="getIconUrl(tech)"
              :alt="tech"
              :title="tech"
              loading="lazy"
              decoding="async"
              width="20"
              height="20"
              :class="['size-5 opacity-70 hover:opacity-100 transition-opacity duration-200', isMono(tech) && 'dark:invert']"
            >
          </div>
        </div>
        <div class="font-mono text-xs text-muted text-right whitespace-nowrap pt-1">{{ item.year }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.exp-item {
  opacity: 0;
  transform: translateY(12px);
  filter: blur(4px);
  transition: opacity 0.5s ease, transform 0.5s ease, filter 0.5s ease;
}

.exp-item.visible {
  opacity: 1;
  transform: translateY(0);
  filter: blur(0);
}
</style>
