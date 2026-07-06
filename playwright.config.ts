import { defineConfig, devices } from '@playwright/test'

const isCI = !!process.env.CI
const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://vue-match-3-game.test'

export default defineConfig({
  testDir: './tests/playwright',
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'artifacts/playwright/report' }],
  ],
  outputDir: 'artifacts/playwright/failures',
  use: {
    ...devices['Desktop Chrome'],
    baseURL,
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    viewport: { width: 1366, height: 768 },
  },
})
