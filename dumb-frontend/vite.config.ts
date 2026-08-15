import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

export default defineConfig({
  plugins: [
    vue(),
    Components({
      dirs: [],
      dts: false,
      resolvers: [ElementPlusResolver()],
    }),
  ],
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
