export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('render:html', (html) => {
    const headStr = html.head.join('')
    const fontLinks: string[] = []

    // Find font URLs already referenced in the head and add preload hints
    const woff2Regex = /\/_nuxt\/[^"']+\.woff2/g
    const seen = new Set<string>()
    let match
    while ((match = woff2Regex.exec(headStr)) !== null) {
      const url = match[0]
      if (!seen.has(url)) {
        seen.add(url)
        fontLinks.push(`<link rel="preload" href="${url}" as="font" type="font/woff2" crossorigin>`)
      }
    }

    if (fontLinks.length) {
      // Insert preloads at the very top of head so browser starts fetching immediately
      html.head.unshift(fontLinks.join('\n') + '\n')
    }
  })
})
