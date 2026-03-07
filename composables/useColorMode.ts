export function useColorMode() {
  const isDark = useState('color-mode', () => false)

  function toggle() {
    isDark.value = !isDark.value
    apply()
    if (import.meta.client) {
      localStorage.setItem('color-mode', isDark.value ? 'dark' : 'light')
    }
  }

  function apply() {
    if (import.meta.client) {
      document.documentElement.classList.toggle('dark', isDark.value)
    }
  }

  onMounted(() => {
    const stored = localStorage.getItem('color-mode')
    if (stored) {
      isDark.value = stored === 'dark'
    } else {
      isDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    apply()
  })

  return { isDark, toggle }
}
