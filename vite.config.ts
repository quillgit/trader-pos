import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['vite.svg', 'pwa-icon.svg','logo-traderpos.png'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,txt}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
      },
      manifest: {
        name: 'TraderPOS',
        short_name: 'TPOS',
        description: 'Offline-first POS commodity trading app',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'logo-traderpos.png',
            sizes: '192x192', // SVGs can be any size, but manifest likes dimensions
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'logo-traderpos.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
