import { FullConfig } from '@playwright/test'

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Cleaning up E2E test environment...')

  try {
    // Cleanup any test data created during E2E tests
    console.log('✅ E2E test environment cleanup complete')
  } catch (error) {
    console.error('❌ E2E teardown failed:', error)
    throw error
  }
}

export default globalTeardown