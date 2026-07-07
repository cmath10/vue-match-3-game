import { defineConfig, devices } from '@playwright/test'

const isCI = !!process.env.CI
const ciBaseURL = 'http://127.0.0.1:5173'
const baseURL = process.env.PLAYWRIGHT_BASE_URL || (isCI ? ciBaseURL : 'http://vue-match-3-game.test')

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
  webServer: isCI
    ? {
        command: 'yarn dev --host 127.0.0.1 --port 5173',
        reuseExistingServer: false,
        timeout: 120_000,
        url: ciBaseURL,
      }
    : undefined,
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
