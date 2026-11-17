import { defineConfig } from '@playwright/test'

// Run with: npm run build && npm run test:e2e
export default defineConfig({
  testDir: './e2e',
  timeout: 60000,
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: { baseURL: 'http://localhost:4321/pawlog/' },
  webServer: {
    command: 'npm run preview -- --port 4321 --strictPort',
    url: 'http://localhost:4321/pawlog/',
    reuseExistingServer: true,
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1280, height: 900 } } },
    { name: 'mobile', use: { viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 } },
  ],
})
