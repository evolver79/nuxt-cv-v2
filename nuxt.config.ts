import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: false },
  modules: [
    '@nuxtjs/google-fonts',
    '@nuxtjs/seo',
  ],
  vite: {
    plugins: [
      tailwindcss(),
    ],
  },
  css: ['~/assets/css/main.css'],
  googleFonts: {
    families: {
      Inter: [300, 400, 500, 600, 700, 800],
      'JetBrains Mono': [400, 500],
    },
    display: 'swap',
    download: true,
    preload: true,
  },
  site: {
    url: 'https://jmolund.no',
    name: 'Joachim Molund',
    description: 'Joachim Molund — Senior Frontend Developer based in Porsgrunn, Norway. Specializing in Vue, Nuxt, Tailwind, and Flutter.',
    defaultLocale: 'en',
  },
  ogImage: {
    defaults: {
      component: 'OgImageDefault',
      width: 1200,
      height: 630,
    },
  },
  app: {
    head: {
      title: 'Joachim Molund',
      htmlAttrs: { lang: 'en' },
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
      ],
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'author', content: 'Joachim Molund' },
        { name: 'theme-color', content: '#f0ebe3', media: '(prefers-color-scheme: light)' },
        { name: 'theme-color', content: '#1a1a1a', media: '(prefers-color-scheme: dark)' },
      ],
    },
  },
})
