import { defineConfig, devices } from "@playwright/test";

// 로컬 Postgres(pnpm db:start)와 개발 서버(3200)를 대상으로 돈다. 로그인은 데모 계정(?demo=empty로 빈 계정)으로 한다.
export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3200",
    ...devices["iPhone 13"],
    browserName: "chromium",
    locale: "ko-KR",
    timezoneId: "Asia/Seoul",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3200",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
