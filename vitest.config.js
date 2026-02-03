import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';

export default defineConfig({
    test: {
        environment: 'jsdom',
        coverage: {
            provider: 'istanbul',
            reporter: ['text', 'json-summary', 'html'],
            thresholds: {
                lines: 70,
                branches: 60,
                functions: 60,
                statements: 70,
                'src/core/**': {
                    lines: 80,
                    branches: 70,
                    functions: 80,
                    statements: 80,
                }
            },
        },
        browser: {
            enabled: false, // Disabled by default, enabled via CLI flag --browser
            provider: playwright(),
            headless: true,
            instances: [
                { browser: 'chromium' },
            ],
        },
    },
});
