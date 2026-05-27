import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const devApiProxyTarget = env.DEV_API_PROXY_TARGET || 'http://127.0.0.1:3001'

  return {
    plugins: [react(), tailwindcss()],
    server: {
      host: '127.0.0.1',
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': {
          target: devApiProxyTarget,
          changeOrigin: true,
          secure: false,
        },
        '/uploads': {
          target: devApiProxyTarget,
          changeOrigin: true,
          secure: false,
        },
      },
      watch: {
        usePolling: true,
        interval: 250,
      },
    },
  }
})
