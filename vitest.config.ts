import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

const TIME_ZONE_BEHIND_UTC = 'America/Sao_Paulo';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    env: { TZ: TIME_ZONE_BEHIND_UTC },
    reporters: ['verbose', ['vitest-sonar-reporter', { outputFile: 'target/test-results/TESTS-results-sonar.xml' }]],
    globals: true,
    logHeapUsage: true,
    maxWorkers: 2,
    environment: 'jsdom',
    cache: false,
    coverage: {
      thresholds: {
        perFile: true,
        100: true,
      },
      provider: 'istanbul',
      reportsDirectory: 'target/test-results/',
      reporter: ['html', 'json', 'json-summary', 'text', 'text-summary', 'lcov', 'clover'],
      watermarks: {
        statements: [100, 100],
        branches: [100, 100],
        functions: [100, 100],
        lines: [100, 100],
      },
    },
  },
});
