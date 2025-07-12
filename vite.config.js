import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0'
  },
  base: '/price-share-pwa/',
  build: {
    outDir: 'docs' // この行を追加
  }
})
