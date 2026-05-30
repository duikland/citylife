import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Vite + Vitest config. Sim/engine tests run in the node environment (no DOM).
export default defineConfig({
  plugins: [react()],
  server: { port: 5188, host: true },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
  },
})
