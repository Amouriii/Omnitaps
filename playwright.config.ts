import { defineConfig } from "@playwright/test";

/**
 * E2E motion smoke tests.
 *
 * `PLAYWRIGHT_CHROMIUM_PATH` points at an already-cached "Google Chrome for
 * Testing" binary so the suite runs on machines where the Playwright CDN
 * download stalls. Remove `executablePath` once `npx playwright install
 * chromium` works on this network.
 */
const chromiumPath =
    process.env.PLAYWRIGHT_CHROMIUM_PATH ||
    `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1234/chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;

const WEB_PORT = Number(process.env.E2E_PORT || 5173);

export default defineConfig({
    testDir: "e2e",
    timeout: 30_000,
    expect: { timeout: 7_000 },
    fullyParallel: false,
    workers: 1,
    retries: process.env.CI ? 1 : 0,
    reporter: "list",
    use: {
        baseURL: `http://localhost:${WEB_PORT}`,
        viewport: { width: 1280, height: 720 },
        launchOptions: {
            executablePath: chromiumPath,
            headless: true,
        },
    },
    webServer: {
        command: `npm run dev -- --host 127.0.0.1 --port ${WEB_PORT}`,
        url: `http://localhost:${WEB_PORT}`,
        reuseExistingServer: false,
        timeout: 60_000,
    },
});
