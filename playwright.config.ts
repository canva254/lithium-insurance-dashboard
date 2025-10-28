import { defineConfig, devices } from '@playwright/test';

const frontendPort = Number(process.env.PLAYWRIGHT_PORT ?? 3000);
const backendPort = Number(process.env.PLAYWRIGHT_BACKEND_PORT ?? 8000);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${frontendPort}`;
const backendCommand =
  process.env.PLAYWRIGHT_BACKEND_COMMAND ??
  `python -m uvicorn api.main:app --host 127.0.0.1 --port ${backendPort}`;
const backendCwd = process.env.PLAYWRIGHT_BACKEND_CWD ?? '../';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL,
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: process.env.PLAYWRIGHT_SKIP_WEB_SERVER
    ? undefined
    : [
        {
          command: backendCommand,
          cwd: backendCwd,
          port: backendPort,
          reuseExistingServer: !process.env.CI,
          stderr: 'pipe',
          stdout: 'pipe',
        },
        {
          command: `npm run dev -- --port ${frontendPort}`,
          port: frontendPort,
          reuseExistingServer: !process.env.CI,
          stderr: 'pipe',
          stdout: 'pipe',
          env: {
            NEXTAUTH_URL: baseURL,
            NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ?? 'development-secret',
            NEXT_PUBLIC_API_BASE_URL:
              process.env.NEXT_PUBLIC_API_BASE_URL ?? `http://127.0.0.1:${backendPort}`,
            PLAYWRIGHT_BYPASS_AUTH: 'true',
            NEXT_PUBLIC_BYPASS_AUTH: 'true',
          },
        },
      ],
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
