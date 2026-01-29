import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/offr3d/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.ico',
        'favicon-16x16.png',
        'favicon-32x32.png',
        'favicon-96x96.png',
        'android-icon-36x36.png',
        'android-icon-48x48.png',
        'android-icon-72x72.png',
        'android-icon-96x96.png',
        'android-icon-144x144.png',
        'android-icon-192x192.png',
        'apple-icon-57x57.png',
        'apple-icon-60x60.png',
        'apple-icon-72x72.png',
        'apple-icon-76x76.png',
        'apple-icon-114x114.png',
        'apple-icon-120x120.png',
        'apple-icon-144x144.png',
        'apple-icon-152x152.png',
        'apple-icon-180x180.png',
        'ms-icon-144x144.png',
        'ms-icon-150x150.png',
        'ms-icon-310x310.png',
        'ms-icon-70x70.png',
        'x3dLogo.png',
        'xinuLogo.png',
      ],
      manifest: {
        name: 'Offr3d',
        short_name: 'Offr3d',
        description: 'Neo-retro offerteconsole van XinuDesign voor 3D-print offertes, klanten en projecten.',
        start_url: '/offr3d/',
        scope: '/offr3d/',
        display: 'standalone',
        orientation: 'any',
        theme_color: '#0e1116',
        background_color: '#0e1116',
        icons: [
          { src: '/offr3d/android-icon-36x36.png', sizes: '36x36', type: 'image/png' },
          { src: '/offr3d/android-icon-48x48.png', sizes: '48x48', type: 'image/png' },
          { src: '/offr3d/android-icon-72x72.png', sizes: '72x72', type: 'image/png' },
          { src: '/offr3d/android-icon-96x96.png', sizes: '96x96', type: 'image/png' },
          { src: '/offr3d/android-icon-144x144.png', sizes: '144x144', type: 'image/png' },
          { src: '/offr3d/android-icon-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/offr3d/apple-icon-180x180.png', sizes: '180x180', type: 'image/png', purpose: 'any' },
        ],
        shortcuts: [
          { name: 'Nieuwe offerte', url: '/offr3d/offerte', description: 'Start een nieuwe offerte' },
          { name: 'Projecten', url: '/offr3d/projecten', description: 'Overzicht van alle projecten' },
          { name: 'Facturen', url: '/offr3d/facturen', description: 'Facturen en betalingen' },
        ],
      },
      workbox: {
        navigateFallback: '/offr3d/index.html',
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,woff2}'],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: /\/offr3d\/api\/.*$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'offr3d-api',
              networkTimeoutSeconds: 6,
              cacheableResponse: {
                statuses: [0, 200],
              },
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60 * 60 * 12, // 12 uur
              },
            },
          },
          {
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'offr3d-images',
              expiration: {
                maxEntries: 80,
                maxAgeSeconds: 60 * 60 * 24 * 14, // 14 dagen
              },
            },
          },
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/offr3d/uploads'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'offr3d-uploads',
              expiration: {
                maxEntries: 80,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 dagen
              },
            },
          },
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/offr3d/'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'offr3d-static',
              expiration: {
                maxEntries: 120,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 dagen
              },
            },
          },
          {
            urlPattern: ({ url }) => url.origin.includes('fonts.googleapis.com'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-styles',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
          {
            urlPattern: ({ url }) => url.origin.includes('fonts.gstatic.com'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              cacheableResponse: {
                statuses: [0, 200],
              },
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
            },
          },
        ],
      },
    }),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'https://xinudesign.be/offr3d',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
