import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Vite Configuration
 *
 * This config handles both development and test environments.
 *
 * Test Configuration (Integration Tests):
 * - Loads environment variables from .env.local
 * - Makes VITE_* variables available via import.meta.env in tests
 * - Required for integration tests that connect to real Supabase database
 * - See TESTING.md for setup instructions
 */
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // By default, only env variables prefixed with `VITE_` are exposed.
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    server: {
      port: 5173
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/__tests__/setup.js',
      // Make env vars available in tests
      env: {
        VITE_SUPABASE_URL: env.VITE_SUPABASE_URL,
        VITE_SUPABASE_ANON_KEY: env.VITE_SUPABASE_ANON_KEY,
        VITE_TEST_USER_EMAIL: env.VITE_TEST_USER_EMAIL,
        VITE_TEST_USER_PASSWORD: env.VITE_TEST_USER_PASSWORD
      },
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        exclude: [
          'node_modules/',
          'src/__tests__/',
          'database/',
          'dist/'
        ]
      }
    }
  }
})
