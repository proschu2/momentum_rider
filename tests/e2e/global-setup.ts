import { chromium, FullConfig } from '@playwright/test'

async function globalSetup(config: FullConfig) {
  console.log('🚀 Setting up E2E test environment...')

  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    // Wait for the application to be ready
    await page.goto(config.webServer?.url || 'http://localhost:5173')

    // Check if the app is running and healthy
    await page.waitForSelector('body', { timeout: 30000 })

    // Check for any critical errors on load
    const errorMessages = await page.locator('[data-testid="error-message"]').count()
    if (errorMessages > 0) {
      console.warn('⚠️ Warning: Error messages detected on page load')
    }

    // Verify the Strategy Hub is available
    const strategyHubExists = await page.locator('[data-testid="strategy-hub"]').count()
    if (strategyHubExists === 0) {
      throw new Error('Strategy Hub component not found - application may not be properly initialized')
    }

    console.log('✅ E2E test environment setup complete')

  } catch (error) {
    console.error('❌ E2E setup failed:', error)
    throw error
  } finally {
    await context.close()
    await browser.close()
  }
}

export default globalSetup