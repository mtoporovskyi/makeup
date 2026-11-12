import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/UI',
  outputDir: './reports',
  fullyParallel: false,
  forbidOnly: true,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'https://makeup.com.ua',
    browserName: 'chromium',
    headless: Boolean(process.env.CI),
    locale: 'uk-UA',
    timezoneId: 'Europe/Kyiv',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      grep: /@web\b/u,
      grepInvert: /@mobile\b/u,
      use: { viewport: { width: 1920, height: 1080 } },
    },
    {
      name: 'mobile',
      grep: /@mobile\b/u,
      grepInvert: /@web\b/u,
      use: { viewport: { width: 414, height: 896 } },
    },
  ],
});
