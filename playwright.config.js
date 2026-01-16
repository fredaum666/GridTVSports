// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * Playwright configuration for GridTV Sports
 * Tests phone fullscreen card views across different mobile devices
 */
module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:3001',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    // Phone devices - using Chromium with mobile viewports
    {
      name: 'iPhone 14',
      use: {
        browserName: 'chromium',
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: 'iPhone 14 Pro Max',
      use: {
        browserName: 'chromium',
        viewport: { width: 430, height: 932 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: 'Pixel 7',
      use: {
        browserName: 'chromium',
        viewport: { width: 412, height: 915 },
        deviceScaleFactor: 2.625,
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: 'Galaxy S9+',
      use: {
        browserName: 'chromium',
        viewport: { width: 320, height: 658 },
        deviceScaleFactor: 4.5,
        isMobile: true,
        hasTouch: true,
      },
    },
    // Small phone
    {
      name: 'iPhone SE',
      use: {
        browserName: 'chromium',
        viewport: { width: 375, height: 667 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      },
    },
  ],

  // Start local server before tests
  webServer: {
    command: 'npm run start',
    url: 'http://localhost:3001',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
