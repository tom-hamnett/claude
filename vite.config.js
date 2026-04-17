import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// In dev mode, proxy /api/* calls to the Express server running on port 3001
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
