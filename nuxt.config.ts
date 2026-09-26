// https://nuxt.com/docs/api/configuration/nuxt-config

const isProduction = process.env.NODE_ENV === 'production'

if (isProduction && (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET)) {
  throw new Error('CRITICAL: JWT_SECRET and JWT_REFRESH_SECRET environment variables must be set in production.')
}

export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@pinia/nuxt',
    '@vueuse/nuxt'
  ],

  devtools: {
    enabled: false
  },

  css: ['~/assets/css/main.css'],

  app: {
    head: {
      title: 'EFE Taxi Dispatch System',
      link: [
        { rel: 'icon', type: 'image/png', href: '/logo.png' },
        { rel: 'shortcut icon', href: '/logo.png' },
        { rel: 'apple-touch-icon', href: '/logo.png' }
      ]
    }
  },

  compatibilityDate: '2025-07-21',

  ssr: true,

  runtimeConfig: {
    mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/efe_taxi_dispatch',
    jwtSecret: process.env.JWT_SECRET || (isProduction ? '' : 'efe-taxi-super-secret-key-change-in-production'),
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || (isProduction ? '' : 'efe-taxi-refresh-super-secret-key-change-in-production-2024'),
    jwtExpires: process.env.JWT_EXPIRES || '1h',
    public: {
      appName: 'EFE Taxi Dispatch System',
      appUrl: process.env.APP_URL || 'http://localhost:3000'
    }
  },

  nitro: {
    experimental: {
      database: false
    }
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  },

  ui: {
    theme: {
      colors: ['primary', 'secondary', 'success', 'warning', 'error', 'info']
    }
  },

  routeRules: {
    '/api/**': {
      cors: false,
      headers: {
        'X-Content-Type-Options': 'nosniff',
        'X-XSS-Protection': '1; mode=block',
        'X-Frame-Options': 'DENY',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
      }
    }
  }
})
