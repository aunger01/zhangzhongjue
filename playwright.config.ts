import { defineConfig, devices } from '@playwright/test';

/**
 * 端到端测试配置。
 * 首次使用需要安装浏览器内核：npm run test:e2e:install
 * 运行：npm run test:e2e
 */
export default defineConfig({
  testDir: './src/tests',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  timeout: 60_000,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    viewport: { width: 1280, height: 900 },
    // 使用完整版 Chromium 内核（而非 headless shell），
    // 这样只需下载 `npx playwright install chromium` 一份内核
    channel: 'chromium',
  },
  projects: [
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'chromium-mobile',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: {
    // 显式绑定 127.0.0.1：默认的 localhost 可能解析到 IPv6 ::1，导致探测失败
    command: 'npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
