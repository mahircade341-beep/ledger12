import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
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
    cssMinify: 'lightningcss',
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
