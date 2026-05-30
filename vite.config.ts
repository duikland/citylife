import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Vite + Vitest config. Sim/engine tests run in the node environment (no DOM).
// The kooker gateway URL is kept OUT of this public repo — set KOOKER_GATEWAY in .env.local
// (see .env.example). Browser -> Vite proxy -> kooker APISIX gateway (avoids CORS).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const kookerGateway = env.KOOKER_GATEWAY || 'http://localhost:8081'
  return {
    plugins: [react()],
    server: {
      port: 5188,
      host: true,
      proxy: {
        '/kooker': {
          target: kookerGateway,
          changeOrigin: true,
          secure: true,
          headers: { 'ngrok-skip-browser-warning': 'true' },
          rewrite: (p) => p.replace(/^\/kooker/, ''),
        },
      },
    },
    test: {
      environment: 'node',
      include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
    },
  }
})
