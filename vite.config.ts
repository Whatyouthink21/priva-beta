import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Priva is a static bundle: everything (TMDB metadata, the two players, the
// two download services) is fetched straight from the browser, so the build
// can be dropped on any static host. No server to babysit.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    target: 'es2022',
    cssCodeSplit: true,
    assetsInlineLimit: 2048,
    chunkSizeWarningLimit: 620,
    rollupOptions: {
      output: {
        // Firebase is heavy and only needed for the signed-in bits, so it
        // gets its own chunk that can warm the HTTP cache on its own.
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('firebase') || id.includes('@firebase')) return 'vendor-firebase'
            if (id.includes('react-router')) return 'vendor-router'
            return 'vendor-react'
          }
        },
      },
    },
  },
  server: {
    host: true,
    port: 5173,
    strictPort: false,
    // Sandboxes and tunnelled previews reach this dev server on a host Vite
    // would otherwise 403 (".. is not allowed"). Dot-prefixed entries match
    // subdomains. Dev-only: `vite build` never reads this.
    allowedHosts: ['.e2b.app', '.preview.app', '.loca.lt', '.trycloudflare.com', '.ngrok-free.app'],
  },
  preview: { host: true, port: 4173, allowedHosts: ['.e2b.app'] },
  appType: 'spa',
})
