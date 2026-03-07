export function useKonami() {
  const konami = [38, 38, 40, 40, 37, 39, 37, 39, 66, 65]
  let kIdx = 0
  const active = ref(false)

  const demoKeys = new Set([37, 38, 39, 40, 27]) // arrows + escape

  function onKeydown(e: KeyboardEvent) {
    if (active.value) {
      if (!demoKeys.has(e.keyCode)) active.value = false
      return
    }
    if (e.keyCode === konami[kIdx]) {
      kIdx++
      if (kIdx === konami.length) {
        kIdx = 0
        active.value = true
      }
    } else {
      kIdx = 0
    }
  }

  onMounted(() => window.addEventListener('keydown', onKeydown))
  onUnmounted(() => window.removeEventListener('keydown', onKeydown))

  return { active }
}
