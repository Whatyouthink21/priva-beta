import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: { 'import.meta.env.VITE_QA': '"1"' },
  build: {
    outDir: 'qa/out',
    emptyOutDir: true,
    minify: false,
    cssCodeSplit: false,
    rollupOptions: {
      input: 'qa/entry.tsx',
      output: { format: 'iife', entryFileNames: 'app.js', inlineDynamicImports: true },
    },
  },
})
