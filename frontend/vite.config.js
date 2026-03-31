import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],

  // './' statt '/' damit Assets in Electron mit relativen Pfaden geladen werden
  base: './',

  server: {
    host: '0.0.0.0',      // ← Alle Interfaces statt localhost!
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      }
    }
  },

  build: {
    outDir: 'dist',
    emptyOutDir: true,
  }
})