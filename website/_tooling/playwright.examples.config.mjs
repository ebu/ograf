import { defineConfig } from '@playwright/test';
import config, { FULL_BROWSER_PROJECTS } from './playwright.config.mjs';

export default defineConfig({
    ...config,
    testIgnore: [],
    testMatch: '**/examples.spec.mjs',
    projects: [FULL_BROWSER_PROJECTS[0]]
});
