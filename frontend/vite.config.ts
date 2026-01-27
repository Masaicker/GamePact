import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  // 默认安全：如果没有设置，允许 localhost
  const allowedHostsConfig = env.VITE_ALLOWED_HOSTS || 'localhost'
  const allowedHosts: boolean | string[] =
    allowedHostsConfig === 'true'
      ? true
      : allowedHostsConfig.split(',').map(h => h.trim())

  return {
    plugins: [vue()],
    define: {
      __APP_NAME__: JSON.stringify('GamePact'),
    },
    server: {
      port: Number(env.VITE_PORT) || 5173,
      host: true,
      allowedHosts,
    },
  }
})
