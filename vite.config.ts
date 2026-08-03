import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'icons/*.png'],
      manifest: {
        name: 'DukaHub — POS & Retail Management',
        short_name: 'DukaHub',
        description: 'Complete retail management system for Kenyan micro-retail shops. POS, inventory, Daftari, cash drawer, and analytics.',
        start_url: '/',
        id: 'dukahub-v10',
        display: 'standalone',
        display_override: ['window-controls-overlay', 'standalone', 'minimal-ui'],
        background_color: '#0a192f',
        theme_color: '#0a192f',
        orientation: 'any',
        categories: ['business', 'finance', 'productivity'],
        lang: 'en-KE',
        scope: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
        shortcuts: [
          { name: 'New Sale', short_name: 'POS', description: 'Open Point of Sale', url: '/pos', icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }] },
          { name: 'Inventory', short_name: 'Stock', description: 'Manage products', url: '/stock', icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }] },
          { name: 'Debtors', short_name: 'Daftari', description: 'Debtor ledger', url: '/daftari', icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }] },
          { name: 'Insights', short_name: 'Reports', description: 'Sales reports', url: '/insights', icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }] },
        ],
      },
      workbox: {
        // Serve the cached app shell for any in-app route while offline.
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg,webp,avif,json}'],
        runtimeCaching: [
          {
            urlPattern: /^https?:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 },
              networkTimeoutSeconds: 10,
            },
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|avif)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
    }),
  ],
  server: {
    hmr: false,
  },
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
    target: 'es2020',
    cssMinify: 'esbuild',
    minify: 'esbuild',
  },
  esbuild: {
    legalComments: 'none',
    drop: ['console', 'debugger'],
  },
  headers: {
    '/assets/*': {
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
    '/icons/*': {
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  },
});
