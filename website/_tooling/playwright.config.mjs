import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.PORT) || 4173;
const ROOT_BASE_URL = `http://127.0.0.1:${PORT}`;
const PREVIEW_BASE_URL = `${ROOT_BASE_URL}/ograf/`;
const MOBILE_TESTS = /@mobile/;
const COMPATIBILITY_TESTS = /@compat/;
const WEBKIT_TESTS = /@(compat|webkit)/;

const desktopProject = {
    name: 'desktop-root',
    use: {
        ...devices['Desktop Chrome'],
        baseURL: ROOT_BASE_URL
    }
};
const mobileProject = {
    name: 'mobile-preview',
    use: {
        ...devices['Pixel 7'],
        baseURL: PREVIEW_BASE_URL
    }
};
const tabletProject = {
    name: 'tablet-preview',
    use: {
        ...devices['Pixel 7'],
        viewport: { width: 820, height: 1180 },
        baseURL: PREVIEW_BASE_URL
    }
};
const firefoxProject = {
    name: 'desktop-firefox-root',
    use: {
        ...devices['Desktop Firefox'],
        baseURL: ROOT_BASE_URL
    }
};
const webkitProject = {
    name: 'mobile-webkit-preview',
    use: {
        ...devices['iPhone 13'],
        baseURL: PREVIEW_BASE_URL
    }
};

export const FULL_BROWSER_PROJECTS = [
    desktopProject,
    mobileProject,
    tabletProject,
    firefoxProject,
    webkitProject
];

const LEAN_BROWSER_PROJECTS = [
    desktopProject,
    {
        ...mobileProject,
        grep: MOBILE_TESTS
    },
    {
        ...firefoxProject,
        grep: COMPATIBILITY_TESTS
    },
    {
        ...webkitProject,
        grep: WEBKIT_TESTS
    }
];

export default defineConfig({
    testDir: './tests',
    timeout: 45_000,
    expect: { timeout: 10_000 },
    fullyParallel: false,
    forbidOnly: Boolean(process.env.CI),
    retries: process.env.CI ? 2 : 0,
    reporter: process.env.CI ? 'github' : 'list',
    use: {
        trace: 'retain-on-failure',
        video: 'retain-on-failure'
    },
    webServer: {
        command: 'node scripts/dev-server.mjs',
        url: `http://127.0.0.1:${PORT}`,
        reuseExistingServer: !process.env.CI,
        env: {
            ...process.env,
            PORT: String(PORT)
        }
    },
    projects: LEAN_BROWSER_PROJECTS
});
