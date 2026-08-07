import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 8180,
    proxy: {
      '/api': {
        target: 'http://localhost:8181',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:8181',
        changeOrigin: true,
      },
    },
  },
  build: {
    assetsDir: 'assets',
  },
})
