<script setup lang="ts">
const props = defineProps<{
  quote: string
}>()

const glyphs = '░▒▓█▄▀▐▌▊▋▍▎╌╍┄┅'
const displayed = ref('')
const el = ref<HTMLElement>()
let resolved = false

function scramble(text: string) {
  return text
    .split('')
    .map((ch) => (ch === ' ' ? ' ' : glyphs[Math.floor(Math.random() * glyphs.length)]))
    .join('')
}

function decode() {
  if (resolved) return
  resolved = true

  const target = props.quote
  const length = target.length
  let iteration = 0
  const maxIterations = length * 3

  const interval = setInterval(() => {
    iteration++
    const progress = iteration / maxIterations

    displayed.value = target
      .split('')
      .map((ch, i) => {
        if (ch === ' ') return ' '
        const charThreshold = i / length
        if (progress > charThreshold + 0.3) return ch
        return glyphs[Math.floor(Math.random() * glyphs.length)]
      })
      .join('')

    if (iteration >= maxIterations) {
      displayed.value = target
      clearInterval(interval)
    }
  }, 35)
}

onMounted(() => {
  displayed.value = scramble(props.quote)
  if (!el.value) return
  const observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) {
        decode()
        observer.disconnect()
      }
    },
    { threshold: 0.5 },
  )
  observer.observe(el.value)
})
</script>

<template>
  <div
    ref="el"
    class="font-mono text-[0.5rem] text-muted/20 tracking-[0.15em] text-center py-6 select-none"
  >
    {{ displayed }}
  </div>
</template>
