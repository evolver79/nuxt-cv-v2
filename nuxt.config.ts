import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: false },

  // Static generation for zero TTFB on Netlify CDN
  ssr: true,
  nitro: {
    prerender: {
      routes: ['/'],
      crawlLinks: true,
    },
    compressPublicAssets: true,
  },

  modules: [
    '@nuxtjs/google-fonts',
    '@nuxtjs/seo',
  ],

  // Route-level caching
  routeRules: {
    '/': { prerender: true },
    '/_nuxt/**': { headers: { 'cache-control': 'public, max-age=31536000, immutable' } },
  },

  vite: {
    plugins: [
      tailwindcss(),
    ],
    build: {
      cssCodeSplit: false,
      rollupOptions: {
        output: {
          manualChunks: {
            three: ['three'],
          },
        },
      },
    },
  },

  css: ['~/assets/css/main.css'],

  // Experimental performance features
  experimental: {
    payloadExtraction: true,
    inlineStyles: true,
  },

  googleFonts: {
    families: {
      Inter: [400, 500, 600, 800],
      'JetBrains Mono': [400],
    },
    subsets: ['latin'],
    display: 'swap',
    download: true,
    preload: true,
    fontsDir: 'fonts',
    fontsPath: '/_nuxt/fonts',
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
        { rel: 'preconnect', href: 'https://cdn.jsdelivr.net', crossorigin: '' },
        { rel: 'dns-prefetch', href: 'https://cdn.jsdelivr.net' },
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
