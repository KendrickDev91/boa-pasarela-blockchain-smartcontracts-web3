import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
    include: ['src/**/*.test.{js,jsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      reportsDirectory: './coverage',
      include: [
        'src/services/**',
        'src/constants/**',
        'src/payment/CryptoFlow.jsx',
        'src/payment/components.jsx',
        'src/components/primitives.jsx',
        'src/admin/FinancialDashboard.jsx',
      ],
    },
  },
})
