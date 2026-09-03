/// <reference types="vitest" />

import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
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
      // `coverageInclude` / `coverageExclude` live in angular.json: scoping set here would be matched
      // against on-disk paths, while the builder collects coverage under its own spec-bundle paths.
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
