import { defineConfig } from '@playwright/test';

import leanConfig, { FULL_BROWSER_PROJECTS } from './playwright.config.mjs';

export default defineConfig({
    ...leanConfig,
    projects: FULL_BROWSER_PROJECTS
});
