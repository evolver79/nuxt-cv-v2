export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('render:html', (html) => {
    html.head.unshift('<!-- ↑↑↓↓←→←→BA -->\n')
  })
})
