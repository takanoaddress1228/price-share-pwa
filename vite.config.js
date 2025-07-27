import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), ''); // 環境変数をロード

  return {
    plugins: [react()],
    server: {
      host: env.VITE_DEV_SERVER_HOST || 'localhost' // 環境変数を使用
    },
    base: '/price-share-pwa/',
    build: {
      outDir: 'docs'
    }
  };
});
