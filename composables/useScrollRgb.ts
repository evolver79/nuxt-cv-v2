export function useScrollRgb() {
  const offset = ref(0)
  const skew = ref(0)
  let lastY = 0
  let smoothSkew = 0
  let raf = 0
  let idle = true

  function update() {
    const y = window.scrollY
    const velocity = y - lastY
    lastY = y

    // RGB split: scales with speed, clamped
    offset.value = Math.min(Math.abs(velocity) * 0.4, 6) * Math.sign(velocity)

    // Horizontal skew: smooth lerp toward target, settles back to 0
    const target = Math.min(Math.abs(velocity) * 0.15, 4) * Math.sign(velocity)
    smoothSkew += (target - smoothSkew) * 0.15
    if (Math.abs(smoothSkew) < 0.01) smoothSkew = 0
    skew.value = smoothSkew

    // Stop loop when settled to save CPU
    if (velocity === 0 && smoothSkew === 0) {
      idle = true
      return
    }
    raf = requestAnimationFrame(update)
  }

  function onScroll() {
    if (idle) {
      idle = false
      lastY = window.scrollY
      raf = requestAnimationFrame(update)
    }
  }

  onMounted(() => {
    lastY = window.scrollY
    window.addEventListener('scroll', onScroll, { passive: true })
  })

  onUnmounted(() => {
    cancelAnimationFrame(raf)
    window.removeEventListener('scroll', onScroll)
  })

  return { offset, skew }
}
